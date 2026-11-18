var mdl_common = require("./../../models/mdl_common");
var asyncLoop = require("node-async-loop");
const commonController = require("./commonController");
const {
  getImageWithFoldername,
  unlinkSingleImage,
} = require("../../services/FileService");

function bulkInsertHrRows(rows, table, db) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  rows.forEach((row) => {
    db.query(`INSERT INTO \`${table}\` SET ?`, row, (err) => {
      if (err) console.error(`[HR] ${table} insert error:`, err.sqlMessage);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
//  HELPER — safe JSON parse (returns [] on failure)
// ─────────────────────────────────────────────────────────────────
function safeParse(str) {
  try {
    return JSON.parse(str) || [];
  } catch (_) {
    return [];
  }
}

function safeStringify(value, fallback = null) {
  try {
    if (value && typeof value === "object") return JSON.stringify(value);
    return JSON.stringify(fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

module.exports = {

  add: function (req, res) {
  try {
    const empData = JSON.parse(JSON.stringify(req?.body));
    console.log("object req.files", req.files);

    const files = [];
    let profile_picture = empData?.profile_picture || "";
    let resume = empData?.resume || "";

    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        if (file.fieldname === "profile_picture") {
          profile_picture = getImageWithFoldername(file.path);
          files.push(profile_picture);
        } else if (file.fieldname === "resume") {
          resume = getImageWithFoldername(file.path);
          files.push(resume);
        } else {
          // Unlink unnecessary files
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(getImageWithFoldername(file.path));
          }
        }
      });
    }

    let filePath = req?.file ? getImageWithFoldername(req?.file?.path) : "";

    var email = empData?.email;
    var password = empData?.password;

    // ── Validations ───────────────────────────────────────
    req.assert("first_name", "First name required.").notEmpty();
    req.assert("last_name", "Last name required.").notEmpty();
    if (typeof empData?.phone != "undefined" && empData?.phone != "") {
      req.assert("phone", "Mobile should be number.").isNumeric();
      req
        .assert("phone", "Mobile length should be 10 digit.")
        .isLength({ min: 10, max: 10 });
    }
    req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
    req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();
    req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();
    req
      .assert("confirm_password", messageClass.VALIDATION.CONFIRM_PASSWORD)
      .notEmpty();
    req
      .assert(
        "confirm_password",
        messageClass.VALIDATION.CONFIRM_PASSWORD_NOT_MATCH,
      )
      .equals(password);

    var errors = req.validationErrors();
    if (errors) {
      return res
        .status(200)
        .json({ error: true, message: errors[0].msg, data: {} });
    }

    const user_id = req?.user?.id;
    const comp_id = req?.user?.comp_id ? parseInt(req.user.comp_id) : 1;

    // ── Check duplicate email ─────────────────────────────
    var sql =
      "SELECT * FROM `users` WHERE `email`= '" +
      email +
      "' and `isdeleted`=0";

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (result.length > 0) {
        return res.status(201).json({
          error: true,
          message: messageClass.RESPONSE.EMAIL_EXISTS,
          data: {},
        });
      } else {
        // ── Hash password ───────────────────────────────
        var salt = bcrypt.genSaltSync(10);
        password = bcrypt.hashSync(password, salt);

        const now = getCurrentDateAndTime();

        // ── Parse existing JSON fields safely ───────────
        const authority_rights = safeStringify(
          safeParse(empData?.authority_rights),
          { can_decide: [], must_escalate: [], cannot_decide: [] },
        );

        const deliverables = safeStringify(
          safeParse(empData?.deliverables),
          { daily: [], weekly: [], monthly: [] },
        );

        const growth_index = safeStringify(
          safeParse(empData?.growth_index),
          { current_zone: "", target_zone: "", top_level_criteria: [] },
        );

        const risks_and_warning = safeStringify(
          safeParse(empData?.risks_and_warning),
          {
            risk_flags: [],
            stage_1: "",
            stage_2: "",
            stage_3: "",
            not_responsible: [],
          },
        );

        // ── Parse NEW JSON fields safely ────────────────

        // hiring_requirements: { min_requirements:[], interview_test, first_45_days }
        const hiring_requirements = safeStringify(
          safeParse(empData?.hiring_requirements),
          { min_requirements: [], interview_test: "", first_45_days: "" },
        );

        // hiring_flags: { green_flags:[], red_flags:[] }
        const hiring_flags = safeStringify(
          safeParse(empData?.hiring_flags),
          { green_flags: [], red_flags: [] },
        );

        // gates: { competency_gates:[], performance_gates:[], behavioural_gates:[] }
        const gates = safeStringify(
          safeParse(empData?.gates),
          { competency_gates: [], performance_gates: [], behavioural_gates: [] },
        );

        // ── Build users row ─────────────────────────────
        var users = {
          // ── Original fields ──
          first_name: empData?.first_name,
          last_name: empData?.last_name,
          email: empData?.email,
          username: empData?.email,
          dob: empData?.dob,
          password: password,
          phone: empData?.phone != "" ? empData?.phone : "",
          active:
            parseInt(empData?.active) === 1 || parseInt(empData?.active) === 0
              ? parseInt(empData?.active)
              : 0,
          department_id: 1,
          post_id: 1,
          joining_date:
            empData?.date_of_joining || empData?.joining_date || null,
          profile_picture: profile_picture,
          created_by: user_id,
          created_at: now,
          comp_id: comp_id,
          resume: resume,

          // ── HR Profile fields ──
          employee_id: empData?.employee_id || null,
          job_title: empData?.job_title || null,
          sub_department: empData?.sub_department || null,
          employment_type: empData?.employment_type || "Full-Time",
          work_location: empData?.work_location || "On-Site",
          reporting_to: empData?.reporting_to || null,
          probation_end_date: empData?.probation_end_date || null,
          job_overview: empData?.job_overview || null,
          role_purpose: empData?.role_purpose || null,
          coordinates_with: empData?.coordinates_with || null,

          // ── Compensation fields ──
          ctc: empData?.ctc || null,
          basic_salary: empData?.basic_salary || null,
          hra: empData?.hra || null,
          allowances: empData?.allowances || null,
          bonus: empData?.bonus || null,
          pay_cycle: empData?.pay_cycle || "Monthly",
          pay_mode: empData?.pay_mode || "Bank Transfer",
          bank_account: empData?.bank_account || null,

          // ── Existing JSON columns ──
          authority_rights: authority_rights,
          deliverables: deliverables,
          growth_index: growth_index,
          risks_and_warning: risks_and_warning,

          // ── NEW JSON columns ──
          hiring_requirements: hiring_requirements,
          hiring_flags: hiring_flags,
          gates: gates,
        };

        // ── Insert user ─────────────────────────────────
        db.query("INSERT INTO `users` SET ?", users, function (err, result) {
          if (err) {
            if (users?.profile_picture) {
              unlinkSingleImage(users?.profile_picture);
            }
            return res
              .status(201)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const newUserId = result.insertId;

          // ── Insert roles (users_groups) ─────────────
          if (empData?.roles) {
            const roleIds = empData.roles
              .split(",")
              .map((id) => parseInt(id.trim()));

            roleIds.forEach((role_id) => {
              const users_groups = {
                mst_user_id: newUserId,
                mst_group_id: role_id,
              };
              db.query(
                "INSERT INTO `users_groups` SET ?",
                users_groups,
                (err) => {
                  if (err) console.log(err);
                },
              );
            });
          }

          // ── Insert departments ──────────────────────
          if (module.exports.verifyJson(empData?.departments)) {
            commonController.addDepartments(
              parseInt(newUserId),
              JSON.parse(empData?.departments),
            );
          }

          // ── Insert Key Responsibilities ─────────────
          const responsibilities = safeParse(empData?.responsibilities);
          const respRows = responsibilities
            .filter((r) => typeof r === "string" && r.trim())
            .map((r) => ({
              user_id: newUserId,
              comp_id: comp_id,
              title: r.trim(),
              created_at: now,
            }));
          bulkInsertHrRows(respRows, "emp_responsibilities", db);

          // ── Insert Strengths ────────────────────────
          const strength = safeParse(empData?.strengths);
          const strengthRows = strength
            .filter((r) => typeof r === "string" && r.trim())
            .map((r) => ({
              user_id: newUserId,
              title: r.trim(),
              created_at: now,
            }));
          bulkInsertHrRows(strengthRows, "emp_strengths", db);

          // ── Insert Weaknesses ───────────────────────
          const weakness = safeParse(empData?.weaknesses);
          const weaknessRows = weakness
            .filter((r) => typeof r === "string" && r.trim())
            .map((r) => ({
              user_id: newUserId,
              title: r.trim(),
              created_at: now,
            }));
          bulkInsertHrRows(weaknessRows, "emp_weaknesses", db);

          // ── Insert Skills ───────────────────────────
          const skills = safeParse(empData?.skills);
          const skillRows = skills
            .filter((s) => s?.name)
            .map((s) => ({
              user_id: newUserId,
              comp_id: comp_id,
              name: s.name.trim(),
              level: Math.min(100, Math.max(1, parseInt(s.level) || 80)),
              created_at: now,
            }));
          bulkInsertHrRows(skillRows, "emp_skills", db);

          // ── Insert Work History ─────────────────────
          const workHistory = safeParse(empData?.work_history);
          const workRows = workHistory
            .filter((w) => w?.role && w?.company)
            .map((w) => ({
              user_id: newUserId,
              comp_id: comp_id,
              role: w.role.trim(),
              company: w.company.trim(),
              period: w.period?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(workRows, "emp_work_history", db);

          // ── Insert Education ────────────────────────
          const education = safeParse(empData?.education);
          const eduRows = education
            .filter((e) => e?.degree && e?.institution)
            .map((e) => ({
              user_id: newUserId,
              comp_id: comp_id,
              degree: e.degree.trim(),
              institution: e.institution.trim(),
              year: e.year?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(eduRows, "emp_education", db);

          // ── Insert Emergency Contacts ───────────────
          const emergency = safeParse(empData?.emergency_contacts);
          const ecRows = emergency
            .filter((c) => c?.name && c?.phone)
            .map((c) => ({
              user_id: newUserId,
              comp_id: comp_id,
              name: c.name.trim(),
              relation: c.relation?.trim() || null,
              phone: c.phone.trim(),
              created_at: now,
            }));
          bulkInsertHrRows(ecRows, "emp_emergency_contacts", db);

          // ── Insert KPIs ─────────────────────────────
          const kpis = safeParse(empData?.kpis);
          const kpiRows = kpis
            .filter((k) => k?.metric && k.metric.trim())
            .map((k) => ({
              user_id: newUserId,
              comp_id: comp_id,
              category: k.category?.trim() || "Other",
              metric: k.metric.trim(),
              target: k.target?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(kpiRows, "emp_kpis", db);

          // ── NEW: Insert Domain Knowledge ────────────
          const domainKnowledge = safeParse(empData?.domain_knowledge);
          const domainRows = domainKnowledge
            .filter((d) => d?.topic && d.topic.trim())
            .map((d) => ({
              user_id: newUserId,
              comp_id: comp_id,
              topic: d.topic.trim(),
              level: d.level?.trim() || "Working",
              created_at: now,
            }));
          bulkInsertHrRows(domainRows, "emp_domain_knowledge", db);

          // ── NEW: Insert Software & Tools ────────────
          const softwareTools = safeParse(empData?.software_tools);
          const toolRows = softwareTools
            .filter((s) => s?.tool && s.tool.trim())
            .map((s) => ({
              user_id: newUserId,
              comp_id: comp_id,
              tool: s.tool.trim(),
              level: s.level?.trim() || "Proficient",
              note: s.note?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(toolRows, "emp_software_tools", db);

          // ── NEW: Insert Behavioural Competencies ────
          const behaviouralCompetencies = safeParse(empData?.behavioural_competencies);
          const competencyRows = behaviouralCompetencies
            .filter((c) => c?.competency && c.competency.trim())
            .map((c) => ({
              user_id: newUserId,
              comp_id: comp_id,
              competency: c.competency.trim(),
              description: c.description?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(competencyRows, "emp_behavioural_competencies", db);

          // ── NEW: Insert KRAs ────────────────────────
          const kras = safeParse(empData?.kras);
          const kraRows = kras
            .filter((k) => k?.kra && k.kra.trim())
            .map((k) => ({
              user_id: newUserId,
              comp_id: comp_id,
              kra: k.kra.trim(),
              target: k.target?.trim() || null,
              created_at: now,
            }));
          bulkInsertHrRows(kraRows, "emp_kras", db);

          // ── NEW: Insert System / Software Module Duties ──
          const systemDuties = safeParse(empData?.system_duties);
          const dutyRows = systemDuties
            .filter((s) => s?.module && s?.duty)
            .map((s) => ({
              user_id: newUserId,
              comp_id: comp_id,
              module: s.module.trim(),
              duty: s.duty.trim(),
              frequency: s.frequency?.trim() || "Daily",
              created_at: now,
            }));
          bulkInsertHrRows(dutyRows, "emp_system_duties", db);

          // ── NEW: Insert Career Growth Path ──────────
          const careerGrowth = safeParse(empData?.career_growth);
          const growthRows = careerGrowth
            .filter((c) => c?.title && c.title.trim())
            .map((c, idx) => ({
              user_id: newUserId,
              comp_id: comp_id,
              grade: c.grade?.trim() || null,
              title: c.title.trim(),
              condition_text: c.condition?.trim() || null,
              sort_order: idx,
              created_at: now,
            }));
          bulkInsertHrRows(growthRows, "emp_career_growth", db);

          // ── NEW: Insert STOP Meeting Duties ─────────
          const stopMeetingDuties = safeParse(empData?.stop_meeting_duties);
          const stopRows = stopMeetingDuties
            .filter((s) => s?.duty && s.duty.trim())
            .map((s) => ({
              user_id: newUserId,
              comp_id: comp_id,
              meeting_type: s.meeting_type?.trim() || "Operational (Daily)",
              duty: s.duty.trim(),
              created_at: now,
            }));
          bulkInsertHrRows(stopRows, "emp_stop_meeting_duties", db);

          // ── Done ────────────────────────────────────
          return res.status(201).json({
            error: false,
            message: "Employee added successfully",
            data: { id: newUserId },
          });
        });
      }
    });
  } catch (err) {
    if (req?.file) {
      unlinkSingleImage(getImageWithFoldername(req?.file?.path));
    }
    return res
      .status(201)
      .json({ error: true, message: "Invalid request", data: {} });
  }
},
// add: function (req, res) {
//   try {
//     const empData = JSON.parse(JSON.stringify(req?.body));
//     console.log("object req.files", req.files);
 
//     const files = [];
//     let profile_picture = "";
//     let resume = "";
 
//     req.files.forEach((file) => {
//       if (file.fieldname === "profile_picture") {
//         profile_picture = getImageWithFoldername(file.path);
//         files.push(profile_picture);
//       } else if (file.fieldname === "resume") {
//         resume = getImageWithFoldername(file.path);
//         files.push(resume);
//       } else {
//         // Unlink unnecessary files
//         unlinkImage(file.path);
//       }
//     });
 
//     let filePath = req?.file ? getImageWithFoldername(req?.file?.path) : "";
 
//     var email = empData?.email;
//     var password = empData?.password;
 
//     // ── Validations ───────────────────────────────────────
//     req.assert("first_name", "First name required.").notEmpty();
//     req.assert("last_name", "Last name required.").notEmpty();
//     if (typeof empData?.phone != "undefined" && empData?.phone != "") {
//       req.assert("phone", "Mobile should be number.").isNumeric();
//       req
//         .assert("phone", "Mobile length should be 10 digit.")
//         .isLength({ min: 10, max: 10 });
//     }
//     req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
//     req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();
//     req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();
//     req
//       .assert("confirm_password", messageClass.VALIDATION.CONFIRM_PASSWORD)
//       .notEmpty();
//     req
//       .assert(
//         "confirm_password",
//         messageClass.VALIDATION.CONFIRM_PASSWORD_NOT_MATCH,
//       )
//       .equals(password);
 
//     var errors = req.validationErrors();
//     if (errors) {
//       return res
//         .status(200)
//         .json({ error: true, message: errors[0].msg, data: {} });
//     }
 
//     const user_id = req?.user?.id;
//     const comp_id = req?.user?.comp_id ? parseInt(req.user.comp_id) : 1;
 
//     // ── Check duplicate email ─────────────────────────────
//     var sql =
//       "SELECT * FROM `users` WHERE `email`= '" +
//       email +
//       "' and `isdeleted`=0";
 
//     db.query(sql, function (err, result) {
//       if (err) {
//         return res
//           .status(201)
//           .json({ error: true, message: err.sqlMessage, data: {} });
//       } else if (result.length > 0) {
//         return res.status(201).json({
//           error: true,
//           message: messageClass.RESPONSE.EMAIL_EXISTS,
//           data: {},
//         });
//       } else {
//         // ── Hash password ───────────────────────────────
//         var salt = bcrypt.genSaltSync(10);
//         password = bcrypt.hashSync(password, salt);
 
//         const now = getCurrentDateAndTime();
 
//         // ── Parse new JSON fields safely ────────────────
//         // authority_rights: { can_decide:[], must_escalate:[], cannot_decide:[] }
//         const authority_rights = safeStringify(
//           safeParse(empData?.authority_rights),
//           { can_decide: [], must_escalate: [], cannot_decide: [] },
//         );
 
//         // deliverables: { daily:[], weekly:[], monthly:[] }
//         const deliverables = safeStringify(
//           safeParse(empData?.deliverables),
//           { daily: [], weekly: [], monthly: [] },
//         );
 
//         // growth_index: { current_zone, target_zone, top_level_criteria:[] }
//         const growth_index = safeStringify(
//           safeParse(empData?.growth_index),
//           { current_zone: "", target_zone: "", top_level_criteria: [] },
//         );
 
//         // risks_and_warning: { risk_flags:[], stage_1, stage_2, stage_3, not_responsible:[] }
//         const risks_and_warning = safeStringify(
//           safeParse(empData?.risks_and_warning),
//           {
//             risk_flags: [],
//             stage_1: "",
//             stage_2: "",
//             stage_3: "",
//             not_responsible: [],
//           },
//         );
 
//         // ── Build users row ─────────────────────────────
//         var users = {
//           // ── Original fields ──
//           first_name: empData?.first_name,
//           last_name: empData?.last_name,
//           email: empData?.email,
//           username: empData?.email,
//           dob: empData?.dob,
//           password: password,
//           phone: empData?.phone != "" ? empData?.phone : "",
//           active:
//             parseInt(empData?.active) === 1 || parseInt(empData?.active) === 0
//               ? parseInt(empData?.active)
//               : 0,
//           department_id: 1,
//           post_id: 1,
//           joining_date:
//             empData?.date_of_joining || empData?.joining_date || null,
//           profile_picture: profile_picture,
//           created_by: user_id,
//           created_at: now,
//           comp_id: comp_id,
//           resume: resume,
 
//           // ── HR Profile fields ──
//           employee_id: empData?.employee_id || null,
//           job_title: empData?.job_title || null,
//           sub_department: empData?.sub_department || null,
//           employment_type: empData?.employment_type || "Full-Time",
//           work_location: empData?.work_location || "On-Site",
//           reporting_to: empData?.reporting_to || null,
//           probation_end_date: empData?.probation_end_date || null,
//           job_overview: empData?.job_overview || null,
 
//           // ── NEW: Role fields ──
//           role_purpose: empData?.role_purpose || null,
//           coordinates_with: empData?.coordinates_with || null,
 
//           // ── Compensation fields ──
//           ctc: empData?.ctc || null,
//           basic_salary: empData?.basic_salary || null,
//           hra: empData?.hra || null,
//           allowances: empData?.allowances || null,
//           bonus: empData?.bonus || null,
//           pay_cycle: empData?.pay_cycle || "Monthly",
//           pay_mode: empData?.pay_mode || "Bank Transfer",
//           bank_account: empData?.bank_account || null,
 
//           // ── NEW: JSON columns ──
//           authority_rights: authority_rights,
//           deliverables: deliverables,
//           growth_index: growth_index,
//           risks_and_warning: risks_and_warning,
//         };
 
//         // ── Insert user ─────────────────────────────────
//         db.query("INSERT INTO `users` SET ?", users, function (err, result) {
//           if (err) {
//             if (users?.profile_picture) {
//               unlinkSingleImage(users?.profile_picture);
//             }
//             return res
//               .status(201)
//               .json({ error: true, message: err.sqlMessage, data: {} });
//           }
 
//           const newUserId = result.insertId;
 
//           // ── Insert roles (users_groups) ─────────────
//           if (empData?.roles) {
//             const roleIds = empData.roles
//               .split(",")
//               .map((id) => parseInt(id.trim()));
 
//             roleIds.forEach((role_id) => {
//               const users_groups = {
//                 mst_user_id: newUserId,
//                 mst_group_id: role_id,
//               };
//               db.query(
//                 "INSERT INTO `users_groups` SET ?",
//                 users_groups,
//                 (err) => {
//                   if (err) console.log(err);
//                 },
//               );
//             });
//           }
 
//           // ── Insert departments ──────────────────────
//           if (module.exports.verifyJson(empData?.departments)) {
//             commonController.addDepartments(
//               parseInt(newUserId),
//               JSON.parse(empData?.departments),
//             );
//           }
 
//           // ── Insert Key Responsibilities ─────────────
//           const responsibilities = safeParse(empData?.responsibilities);
//           const respRows = responsibilities
//             .filter((r) => typeof r === "string" && r.trim())
//             .map((r) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               title: r.trim(),
//               created_at: now,
//             }));
//           bulkInsertHrRows(respRows, "emp_responsibilities", db);
 
//           // ── Insert Strengths ────────────────────────
//           const strength = safeParse(empData?.strengths);
//           const strengthRows = strength
//             .filter((r) => typeof r === "string" && r.trim())
//             .map((r) => ({
//               user_id: newUserId,
//               title: r.trim(),
//               created_at: now,
//             }));
//           bulkInsertHrRows(strengthRows, "emp_strengths", db);
 
//           // ── Insert Weaknesses ───────────────────────
//           const weakness = safeParse(empData?.weaknesses);
//           const weaknessRows = weakness
//             .filter((r) => typeof r === "string" && r.trim())
//             .map((r) => ({
//               user_id: newUserId,
//               title: r.trim(),
//               created_at: now,
//             }));
//           bulkInsertHrRows(weaknessRows, "emp_weaknesses", db);
 
//           // ── Insert Skills ───────────────────────────
//           const skills = safeParse(empData?.skills);
//           const skillRows = skills
//             .filter((s) => s?.name)
//             .map((s) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               name: s.name.trim(),
//               level: Math.min(100, Math.max(1, parseInt(s.level) || 80)),
//               created_at: now,
//             }));
//           bulkInsertHrRows(skillRows, "emp_skills", db);
 
//           // ── Insert Work History ─────────────────────
//           const workHistory = safeParse(empData?.work_history);
//           const workRows = workHistory
//             .filter((w) => w?.role && w?.company)
//             .map((w) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               role: w.role.trim(),
//               company: w.company.trim(),
//               period: w.period?.trim() || null,
//               created_at: now,
//             }));
//           bulkInsertHrRows(workRows, "emp_work_history", db);
 
//           // ── Insert Education ────────────────────────
//           const education = safeParse(empData?.education);
//           const eduRows = education
//             .filter((e) => e?.degree && e?.institution)
//             .map((e) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               degree: e.degree.trim(),
//               institution: e.institution.trim(),
//               year: e.year?.trim() || null,
//               created_at: now,
//             }));
//           bulkInsertHrRows(eduRows, "emp_education", db);
 
//           // ── Insert Emergency Contacts ───────────────
//           const emergency = safeParse(empData?.emergency_contacts);
//           const ecRows = emergency
//             .filter((c) => c?.name && c?.phone)
//             .map((c) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               name: c.name.trim(),
//               relation: c.relation?.trim() || null,
//               phone: c.phone.trim(),
//               created_at: now,
//             }));
//           bulkInsertHrRows(ecRows, "emp_emergency_contacts", db);
 
//           // ── NEW: Insert KPIs ────────────────────────
//           const kpis = safeParse(empData?.kpis);
//           const kpiRows = kpis
//             .filter((k) => k?.metric && k.metric.trim())
//             .map((k) => ({
//               user_id: newUserId,
//               comp_id: comp_id,
//               category: k.category?.trim() || "Other",
//               metric: k.metric.trim(),
//               target: k.target?.trim() || null,
//               created_at: now,
//             }));
//           bulkInsertHrRows(kpiRows, "emp_kpis", db);
 
//           // ── Done ────────────────────────────────────
//           return res.status(201).json({
//             error: false,
//             message: "Employee added successfully",
//             data: { id: newUserId },
//           });
//         });
//       }
//     });
//   } catch (err) {
//     if (req?.file) {
//       unlinkSingleImage(getImageWithFoldername(req?.file?.path));
//     }
//     return res
//       .status(201)
//       .json({ error: true, message: "Invalid request", data: {} });
//   }
// },


  getEmployee: async function (req, res) {
    var sql = `SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.username,
    u.phone,
    u.profile_picture,
    DATE_FORMAT(u.created_at, '%d %b %Y') AS created_at,
    u.active,
    GROUP_CONCAT(DISTINCT msd.name SEPARATOR ', ') as departmentName,
    GROUP_CONCAT(DISTINCT mg.name SEPARATOR ', ') as RolesName
FROM users as u 
LEFT JOIN users_groups as mu ON mu.mst_user_id = u.id
LEFT JOIN mst_groups as mg ON mg.id = mu.mst_group_id
LEFT JOIN user_department_post as udp ON udp.user_id = u.id
LEFT JOIN mst_department msd ON msd.id = udp.department_id
WHERE u.isdeleted = 0 
AND u.id IN (
    -- Filter only users who belong to the 'Employees' group
    SELECT mu2.mst_user_id 
    FROM users_groups mu2
    LEFT JOIN mst_groups mg2 ON mg2.id = mu2.mst_group_id
    WHERE mg2.name = 'Employees'
)
GROUP BY 
    u.id, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.username, 
    u.phone, 
    u.profile_picture, 
    u.created_at, 
    u.active
ORDER BY u.active DESC`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record Fetch", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },
  getActiveEmployee: (req, res) => {
    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`email`,`u`.`username`,`u`.`phone`,`u`.`profile_picture`,`u`.`created_at`,`u`.`active` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` WHERE `u`.`isdeleted`=0 AND `mg`.`name`='Employees' and `u`.`active`=1 ORDER BY u.first_name ASC";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record Fetch", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },
  fetchHod: (req, res) => {
    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`last_name`,`u`.`email`,`u`.`username`,`u`.`phone`,`u`.`profile_picture`,`u`.`created_at`,`u`.`active` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` WHERE `u`.`isdeleted`=0 AND `mg`.`name`='Hod' and `u`.`active`=1 ORDER BY u.first_name ASC";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record Fetch", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },


  getEmployeeById: async (req, res) => {
  var id = parseInt(req.params.id);

  if (!id) {
    return res
      .status(201)
      .json({ error: false, message: "ID is required", data: {} });
  }

  const user_id = req.user.id;
  const comp_id = req.user.comp_id;

  // ── 1. Main user row ──────────────────────────────────────────────────────
  var userSql = `
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.username, u.phone, u.shift_id,
      u.profile_picture, u.department_id, u.post_id, u.created_at, u.active, u.dob, u.resume,

      -- HR Profile fields
      u.employee_id, u.job_title, u.sub_department,
      u.employment_type, u.work_location, u.reporting_to,
      u.joining_date, u.probation_end_date, u.job_overview,

      -- Role fields
      u.role_purpose, u.coordinates_with,

      -- Compensation fields
      u.ctc, u.basic_salary, u.hra, u.allowances, u.bonus,
      u.pay_cycle, u.pay_mode, u.bank_account,

      -- Existing JSON columns
      u.authority_rights, u.deliverables, u.growth_index, u.risks_and_warning,

      -- NEW JSON columns
      u.hiring_requirements, u.hiring_flags, u.gates

    FROM users AS u
    LEFT JOIN users_groups AS mu ON mu.mst_user_id = u.id
    LEFT JOIN mst_groups   AS mg ON mg.id = mu.mst_group_id
    WHERE u.isdeleted = 0 AND mg.name = 'Employees' AND u.id = ?
  `;

  db.query(userSql, [id], (err, userResult) => {
    if (err) {
      console.log(err);
      return res
        .status(201)
        .json({ error: true, message: err.sqlMessage, data: {} });
    }

    if (!userResult.length) {
      return res.status(201).json({
        error: true,
        message: "Requested record not found!",
        data: {},
      });
    }

    // ── Parse all JSON columns safely ──────────────────────────────────────
    const row = userResult[0];

    const safeParseJson = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === "object") return val;
      try { return JSON.parse(val); } catch { return fallback; }
    };

    // Existing JSON columns
    userResult[0].authority_rights  = safeParseJson(row.authority_rights,  { can_decide: [], must_escalate: [], cannot_decide: [] });
    userResult[0].deliverables      = safeParseJson(row.deliverables,      { daily: [], weekly: [], monthly: [] });
    userResult[0].growth_index      = safeParseJson(row.growth_index,      { current_zone: "", target_zone: "", top_level_criteria: [] });
    userResult[0].risks_and_warning = safeParseJson(row.risks_and_warning, { risk_flags: [], stage_1: "", stage_2: "", stage_3: "", not_responsible: [] });

    // NEW JSON columns
    userResult[0].hiring_requirements = safeParseJson(row.hiring_requirements, { min_requirements: [], interview_test: "", first_45_days: "" });
    userResult[0].hiring_flags        = safeParseJson(row.hiring_flags,        { green_flags: [], red_flags: [] });
    userResult[0].gates               = safeParseJson(row.gates,               { competency_gates: [], performance_gates: [], behavioural_gates: [] });

    // ── 2. Departments ────────────────────────────────────────────────────
    var deptSql = `
      SELECT udp.id, udp.department_id, md.name
      FROM user_department_post AS udp
      JOIN mst_department AS md ON udp.department_id = md.id
      WHERE udp.user_id = ?
    `;

    db.query(deptSql, [id], (err, departments) => {
      if (err) console.log(err);

      // ── 3. Roles ──────────────────────────────────────────────────────
      var roleSql = `
        SELECT ug.mst_group_id, mg.description
        FROM users_groups AS ug
        LEFT JOIN mst_groups AS mg ON mg.id = ug.mst_group_id
        WHERE ug.mst_user_id = ?
      `;

      db.query(roleSql, [id], (err, rolesResult) => {
        if (err) console.log(err);

        // ── 4. Schedule ───────────────────────────────────────────────
        var usertimeSql = `SELECT id, week, from_time, to_time FROM user_time WHERE user_id = ?`;

        db.query(usertimeSql, [id], (err, usertimeResult) => {
          if (err) console.log(err);

          // ── 5. Key Responsibilities ───────────────────────────────
          var respSql = `SELECT id, title FROM emp_responsibilities WHERE user_id = ? ORDER BY id ASC`;

          db.query(respSql, [id], (err, responsibilities) => {
            if (err) console.log(err);

            const responsibilityList = (responsibilities || []).map((r) => r.title);

            // ── 6. Skills ─────────────────────────────────────────
            var skillsSql = `SELECT id, name, level FROM emp_skills WHERE user_id = ? ORDER BY id ASC`;

            db.query(skillsSql, [id], (err, skills) => {
              if (err) console.log(err);

              // ── 7. Work History ───────────────────────────────
              var workSql = `SELECT id, role, company, period FROM emp_work_history WHERE user_id = ? ORDER BY id ASC`;

              db.query(workSql, [id], (err, workHistory) => {
                if (err) console.log(err);

                // ── 8. Education ──────────────────────────────
                var eduSql = `SELECT id, degree, institution, year FROM emp_education WHERE user_id = ? ORDER BY id ASC`;

                db.query(eduSql, [id], (err, education) => {
                  if (err) console.log(err);

                  // ── 9. Emergency Contacts ─────────────────
                  var ecSql = `SELECT id, name, relation, phone FROM emp_emergency_contacts WHERE user_id = ? ORDER BY id ASC`;

                  db.query(ecSql, [id], (err, emergencyContacts) => {
                    if (err) console.log(err);

                    // ── 10. Strengths ─────────────────────
                    var strengthSql = `SELECT id, title FROM emp_strengths WHERE user_id = ? ORDER BY id ASC`;

                    db.query(strengthSql, [id], (err, strength) => {
                      if (err) console.log(err);

                      const strengthList = (strength || []).map((r) => r.title);

                      // ── 11. Weaknesses ────────────────
                      var weaknessSql = `SELECT id, title FROM emp_weaknesses WHERE user_id = ? ORDER BY id ASC`;

                      db.query(weaknessSql, [id], (err, weakness) => {
                        if (err) console.log(err);

                        const weaknessList = (weakness || []).map((r) => r.title);

                        // ── 12. KPIs ──────────────────────
                        var kpiSql = `SELECT id, category, metric, target FROM emp_kpis WHERE user_id = ? ORDER BY id ASC`;

                        db.query(kpiSql, [id], (err, kpis) => {
                          if (err) console.log(err);

                          // ── NEW 13. Domain Knowledge ──────────────────────
                          var domainSql = `SELECT id, topic, level FROM emp_domain_knowledge WHERE user_id = ? ORDER BY id ASC`;

                          db.query(domainSql, [id], (err, domainKnowledge) => {
                            if (err) console.log(err);

                            // ── NEW 14. Software & Tools ──────────────────────
                            var toolsSql = `SELECT id, tool, level, note FROM emp_software_tools WHERE user_id = ? ORDER BY id ASC`;

                            db.query(toolsSql, [id], (err, softwareTools) => {
                              if (err) console.log(err);

                              // ── NEW 15. Behavioural Competencies ──────────────────────
                              var competencySql = `SELECT id, competency, description FROM emp_behavioural_competencies WHERE user_id = ? ORDER BY id ASC`;

                              db.query(competencySql, [id], (err, behaviouralCompetencies) => {
                                if (err) console.log(err);

                                // ── NEW 16. KRAs ──────────────────────
                                var kraSql = `SELECT id, kra, target FROM emp_kras WHERE user_id = ? ORDER BY id ASC`;

                                db.query(kraSql, [id], (err, kras) => {
                                  if (err) console.log(err);

                                  // ── NEW 17. System / Software Module Duties ──────────────────────
                                  var dutySql = `SELECT id, module, duty, frequency FROM emp_system_duties WHERE user_id = ? ORDER BY id ASC`;

                                  db.query(dutySql, [id], (err, systemDuties) => {
                                    if (err) console.log(err);

                                    // ── NEW 18. Career Growth Path ──────────────────────
                                    var growthSql = `SELECT id, grade, title, condition_text AS \`condition\`, sort_order FROM emp_career_growth WHERE user_id = ? ORDER BY sort_order ASC`;

                                    db.query(growthSql, [id], (err, careerGrowth) => {
                                      if (err) console.log(err);

                                      // ── NEW 19. STOP Meeting Duties ──────────────────────
                                      var stopSql = `SELECT id, meeting_type, duty FROM emp_stop_meeting_duties WHERE user_id = ? ORDER BY id ASC`;

                                      db.query(stopSql, [id], (err, stopMeetingDuties) => {
                                        if (err) console.log(err);

                                        // ── Final Response ────────────────────────────────────
                                        return res.status(201).json({
                                          error: false,
                                          message: "Record fetched",

                                          // Main user row (all JSON columns already parsed above)
                                          data: userResult,
                                          departments: departments || [],
                                          roles: rolesResult || [],
                                          schedule: usertimeResult || [],

                                          // Existing HR child tables
                                          responsibilities: responsibilityList || [],
                                          skills: skills || [],
                                          work_history: workHistory || [],
                                          education: education || [],
                                          emergency_contacts: emergencyContacts || [],
                                          strength: strengthList || [],
                                          weakness: weaknessList || [],
                                          kpis: kpis || [],

                                          // Existing JSON fields (parsed from userResult[0])
                                          authority_rights:  userResult[0].authority_rights,
                                          deliverables:      userResult[0].deliverables,
                                          growth_index:      userResult[0].growth_index,
                                          risks_and_warning: userResult[0].risks_and_warning,

                                          // NEW JSON fields (parsed from userResult[0])
                                          hiring_requirements: userResult[0].hiring_requirements,
                                          hiring_flags:        userResult[0].hiring_flags,
                                          gates:               userResult[0].gates,

                                          // NEW child table fields
                                          domain_knowledge:           domainKnowledge || [],
                                          software_tools:             softwareTools || [],
                                          behavioural_competencies:   behaviouralCompetencies || [],
                                          kras:                       kras || [],
                                          system_duties:              systemDuties || [],
                                          career_growth:              careerGrowth || [],
                                          stop_meeting_duties:        stopMeetingDuties || [],
                                        });
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
},

//   getEmployeeById: async (req, res) => {
//   var id = parseInt(req.params.id);

//   if (!id) {
//     return res
//       .status(201)
//       .json({ error: false, message: "ID is required", data: {} });
//   }

//   const user_id = req.user.id;
//   const comp_id = req.user.comp_id;

//   // ── 1. Main user row ──────────────────────────────────────────────────────
//   var userSql = `
//     SELECT
//       u.id, u.first_name, u.last_name, u.email, u.username, u.phone, u.shift_id,
//       u.profile_picture, u.department_id, u.post_id, u.created_at, u.active, u.dob, u.resume,

//       -- HR Profile fields
//       u.employee_id, u.job_title, u.sub_department,
//       u.employment_type, u.work_location, u.reporting_to,
//       u.joining_date, u.probation_end_date, u.job_overview,

//       -- NEW: Role fields
//       u.role_purpose, u.coordinates_with,

//       -- Compensation fields
//       u.ctc, u.basic_salary, u.hra, u.allowances, u.bonus,
//       u.pay_cycle, u.pay_mode, u.bank_account,

//       -- NEW: JSON columns
//       u.authority_rights, u.deliverables, u.growth_index, u.risks_and_warning

//     FROM users AS u
//     LEFT JOIN users_groups AS mu ON mu.mst_user_id = u.id
//     LEFT JOIN mst_groups   AS mg ON mg.id = mu.mst_group_id
//     WHERE u.isdeleted = 0 AND mg.name = 'Employees' AND u.id = ?
//   `;

//   db.query(userSql, [id], (err, userResult) => {
//     if (err) {
//       console.log(err);
//       return res
//         .status(201)
//         .json({ error: true, message: err.sqlMessage, data: {} });
//     }

//     if (!userResult.length) {
//       return res.status(201).json({
//         error: true,
//         message: "Requested record not found!",
//         data: {},
//       });
//     }

//     // ── Parse JSON columns from the users row ──────────────────────────────
//     // MySQL returns JSON columns as strings; parse them safely before sending.
//     const row = userResult[0];

//     const safeParseJson = (val, fallback) => {
//       if (!val) return fallback;
//       if (typeof val === "object") return val; // already parsed by some drivers
//       try { return JSON.parse(val); } catch { return fallback; }
//     };

//     userResult[0].authority_rights  = safeParseJson(row.authority_rights,  { can_decide: [], must_escalate: [], cannot_decide: [] });
//     userResult[0].deliverables       = safeParseJson(row.deliverables,       { daily: [], weekly: [], monthly: [] });
//     userResult[0].growth_index       = safeParseJson(row.growth_index,       { current_zone: "", target_zone: "", top_level_criteria: [] });
//     userResult[0].risks_and_warning  = safeParseJson(row.risks_and_warning,  { risk_flags: [], stage_1: "", stage_2: "", stage_3: "", not_responsible: [] });

//     // ── 2. Departments ────────────────────────────────────────────────────
//     var deptSql = `
//       SELECT udp.id, udp.department_id, md.name
//       FROM user_department_post AS udp
//       JOIN mst_department AS md ON udp.department_id = md.id
//       WHERE udp.user_id = ?
//     `;

//     db.query(deptSql, [id], (err, departments) => {
//       if (err) console.log(err);

//       // ── 3. Roles ──────────────────────────────────────────────────────
//       var roleSql = `
//         SELECT ug.mst_group_id, mg.description
//         FROM users_groups AS ug
//         LEFT JOIN mst_groups AS mg ON mg.id = ug.mst_group_id
//         WHERE ug.mst_user_id = ?
//       `;

//       db.query(roleSql, [id], (err, rolesResult) => {
//         if (err) console.log(err);

//         // ── 4. Schedule ───────────────────────────────────────────────
//         var usertimeSql = `SELECT id, week, from_time, to_time FROM user_time WHERE user_id = ?`;

//         db.query(usertimeSql, [id], (err, usertimeResult) => {
//           if (err) console.log(err);

//           // ── 5. Key Responsibilities ───────────────────────────────
//           var respSql = `SELECT id, title FROM emp_responsibilities WHERE user_id = ? ORDER BY id ASC`;

//           db.query(respSql, [id], (err, responsibilities) => {
//             if (err) console.log(err);

//             const responsibilityList = (responsibilities || []).map((r) => r.title);

//             // ── 6. Skills ─────────────────────────────────────────
//             var skillsSql = `SELECT id, name, level FROM emp_skills WHERE user_id = ? ORDER BY id ASC`;

//             db.query(skillsSql, [id], (err, skills) => {
//               if (err) console.log(err);

//               // ── 7. Work History ───────────────────────────────
//               var workSql = `SELECT id, role, company, period FROM emp_work_history WHERE user_id = ? ORDER BY id ASC`;

//               db.query(workSql, [id], (err, workHistory) => {
//                 if (err) console.log(err);

//                 // ── 8. Education ──────────────────────────────
//                 var eduSql = `SELECT id, degree, institution, year FROM emp_education WHERE user_id = ? ORDER BY id ASC`;

//                 db.query(eduSql, [id], (err, education) => {
//                   if (err) console.log(err);

//                   // ── 9. Emergency Contacts ─────────────────
//                   var ecSql = `SELECT id, name, relation, phone FROM emp_emergency_contacts WHERE user_id = ? ORDER BY id ASC`;

//                   db.query(ecSql, [id], (err, emergencyContacts) => {
//                     if (err) console.log(err);

//                     // ── 10. Strengths ─────────────────────
//                     var strengthSql = `SELECT id, title FROM emp_strengths WHERE user_id = ? ORDER BY id ASC`;

//                     db.query(strengthSql, [id], (err, strength) => {
//                       if (err) console.log(err);

//                       const strengthList = (strength || []).map((r) => r.title);

//                       // ── 11. Weaknesses ────────────────
//                       var weaknessSql = `SELECT id, title FROM emp_weaknesses WHERE user_id = ? ORDER BY id ASC`;

//                       db.query(weaknessSql, [id], (err, weakness) => {
//                         if (err) console.log(err);

//                         const weaknessList = (weakness || []).map((r) => r.title);

//                         // ── NEW 12. KPIs ──────────────
//                         var kpiSql = `SELECT id, category, metric, target FROM emp_kpis WHERE user_id = ? ORDER BY id ASC`;

//                         db.query(kpiSql, [id], (err, kpis) => {
//                           if (err) console.log(err);

//                           // ── Final Response ────────────────────────────────────
//                           return res.status(201).json({
//                             error: false,
//                             message: "Record fetched",

//                             // Main user row (JSON columns already parsed above)
//                             data: userResult,
//                             departments: departments || [],
//                             roles: rolesResult || [],
//                             schedule: usertimeResult || [],

//                             // HR child tables
//                             responsibilities: responsibilityList || [],
//                             skills: skills || [],
//                             work_history: workHistory || [],
//                             education: education || [],
//                             emergency_contacts: emergencyContacts || [],
//                             strength: strengthList || [],
//                             weakness: weaknessList || [],

//                             // NEW fields
//                             kpis: kpis || [],

//                             // NEW JSON fields (already parsed, pulled from userResult[0])
//                             authority_rights:  userResult[0].authority_rights,
//                             deliverables:      userResult[0].deliverables,
//                             growth_index:      userResult[0].growth_index,
//                             risks_and_warning: userResult[0].risks_and_warning,
//                           });
//                         });
//                       });
//                     });
//                   });
//                 });
//               });
//             });
//           });
//         });
//       });
//     });
//   });
// },


update: function (req, res) {
  try {
    const empData = JSON.parse(JSON.stringify(req?.body));
    console.log("===>", req?.files);

    var oldFiles = [];
    var newFiles = [];
    var profile_picture = empData?.profile_picture || "";
    var resume = empData?.resume || "";

    if (req?.files && Array.isArray(req?.files)) {
      req.files.forEach((f) => {
        if (f.fieldname === "profile_picture") {
          profile_picture = getImageWithFoldername(f.path);
          newFiles.push(profile_picture);
        } else if (f.fieldname === "resume") {
          resume = getImageWithFoldername(f.path);
          newFiles.push(resume);
        } else {
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    }

    var id = empData?.id;
    var email = empData?.email;
    let password = empData?.password;

    // ── Validations ───────────────────────────────────────
    req.assert("id", "Employee Id required.").notEmpty();
    req.assert("first_name", "First name required.").notEmpty();
    req.assert("last_name", "Last name required.").notEmpty();
    if (typeof empData?.phone != "undefined" && empData?.phone != "") {
      req.assert("phone", "Mobile should be number.").isNumeric();
      req
        .assert("phone", "Mobile length should be 10 digit.")
        .isLength({ min: 10, max: 10 });
    }
    req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
    req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();

    var errors = req.validationErrors();
    if (errors) {
      return res
        .status(201)
        .send({ error: true, message: errors[0].msg, data: {} });
    }

    const user_id = req?.user?.id;
    const comp_id = req?.user?.comp_id ? parseInt(req.user.comp_id) : 1;
    const schedule = JSON.parse(req.body.schedule || "{}");
    const now = getCurrentDateAndTime();

    // ═══════════════════════════════════════════════════════
    //  SYNC HELPER — HR child tables
    //  • row has id   → UPDATE
    //  • row no id    → INSERT
    //  • db row not in incoming → DELETE
    // ═══════════════════════════════════════════════════════
    function syncHrTable(table, userId, incomingRows, buildUpdateSql, buildInsertRow) {
      db.query(
        `SELECT id FROM \`${table}\` WHERE user_id = ?`,
        [userId],
        (err, dbRows) => {
          if (err) {
            console.error(`[HR] ${table} fetch error:`, err.sqlMessage);
            return;
          }

          const dbIds = dbRows.map((r) => r.id);
          const incomingIds = incomingRows
            .filter((r) => r.id)
            .map((r) => parseInt(r.id));

          const toDelete = dbIds.filter((dbId) => !incomingIds.includes(dbId));
          if (toDelete.length > 0) {
            db.query(
              `DELETE FROM \`${table}\` WHERE id IN (?) AND user_id = ?`,
              [toDelete, userId],
              (err) => {
                if (err) console.error(`[HR] ${table} delete error:`, err.sqlMessage);
              },
            );
          }

          incomingRows
            .filter((r) => r.id)
            .forEach((r) => {
              const { sql, params } = buildUpdateSql(r);
              db.query(sql, params, (err) => {
                if (err) console.error(`[HR] ${table} update error:`, err.sqlMessage);
              });
            });

          incomingRows
            .filter((r) => !r.id)
            .forEach((r) => {
              db.query(
                `INSERT INTO \`${table}\` SET ?`,
                buildInsertRow(r),
                (err) => {
                  if (err) console.error(`[HR] ${table} insert error:`, err.sqlMessage);
                },
              );
            });
        },
      );
    }

    // ── TITLE-BASED SYNC HELPER ───────────────────────────
    // For tables that don't use row IDs (responsibilities, strengths, weaknesses)
    function syncTitleTable(table, userId, incomingTitles, buildInsertRow) {
      db.query(
        `SELECT id, title FROM \`${table}\` WHERE user_id = ?`,
        [parseInt(userId)],
        (err, dbResps) => {
          if (err) {
            console.error(`[HR] ${table} fetch error:`, err.sqlMessage);
            return;
          }

          const dbTitles = dbResps.map((r) => r.title);
          const normalised = incomingTitles.map((r) => r.trim());

          const toDelete = dbResps.filter((r) => !normalised.includes(r.title));
          if (toDelete.length > 0) {
            db.query(
              `DELETE FROM \`${table}\` WHERE id IN (?) AND user_id = ?`,
              [toDelete.map((r) => r.id), parseInt(userId)],
              (err) => {
                if (err) console.error(`[HR] ${table} delete error:`, err.sqlMessage);
              },
            );
          }

          normalised
            .filter((t) => !dbTitles.includes(t))
            .forEach((title) => {
              db.query(
                `INSERT INTO \`${table}\` SET ?`,
                buildInsertRow(title),
                (err) => {
                  if (err) console.error(`[HR] ${table} insert error:`, err.sqlMessage);
                },
              );
            });
        },
      );
    }

    // ── Check duplicate email ─────────────────────────────
    var sqlEmail =
      "SELECT * FROM `users` WHERE `email`= '" +
      email +
      "' and id!='" +
      id +
      "' and `isdeleted`=0";

    db.query(sqlEmail, function (err, result) {
      if (err) {
        console.log(err);
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else if (result.length > 0) {
        return res
          .status(201)
          .json({ error: true, message: "Email already exists", data: {} });
      }

      // ── Fetch existing user row ───────────────────────
      var sqlOld = "SELECT * FROM `users` WHERE `id`='" + id + "'";
      db.query(sqlOld, (err, oldData) => {
        if (err) {
          return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (!oldData || oldData.length === 0) {
          return res.status(201).json({ error: true, message: "Employee not found.", data: {} });
        }

        if (profile_picture) {
          if (oldData[0].profile_picture && oldData[0].profile_picture !== profile_picture) {
            oldFiles.push(oldData[0].profile_picture);
          }
        } else {
          profile_picture = oldData[0].profile_picture;
        }

        if (resume) {
          if (oldData[0].resume && oldData[0].resume !== resume) {
            oldFiles.push(oldData[0].resume);
          }
        } else {
          resume = oldData[0].resume;
        }

        const profile_picture_url = profile_picture;
        const resume_url = resume;

        // ── Parse existing JSON fields safely ────────────────
        const authority_rights =
          typeof empData?.authority_rights !== "undefined"
            ? safeStringify(safeParse(empData.authority_rights), {
                can_decide: [], must_escalate: [], cannot_decide: [],
              })
            : oldData[0].authority_rights || null;

        const deliverables =
          typeof empData?.deliverables !== "undefined"
            ? safeStringify(safeParse(empData.deliverables), {
                daily: [], weekly: [], monthly: [],
              })
            : oldData[0].deliverables || null;

        const growth_index =
          typeof empData?.growth_index !== "undefined"
            ? safeStringify(safeParse(empData.growth_index), {
                current_zone: "", target_zone: "", top_level_criteria: [],
              })
            : oldData[0].growth_index || null;

        const risks_and_warning =
          typeof empData?.risks_and_warning !== "undefined"
            ? safeStringify(safeParse(empData.risks_and_warning), {
                risk_flags: [], stage_1: "", stage_2: "", stage_3: "", not_responsible: [],
              })
            : oldData[0].risks_and_warning || null;

        // ── Parse NEW JSON fields safely ─────────────────────
        const hiring_requirements =
          typeof empData?.hiring_requirements !== "undefined"
            ? safeStringify(safeParse(empData.hiring_requirements), {
                min_requirements: [], interview_test: "", first_45_days: "",
              })
            : oldData[0].hiring_requirements || null;

        const hiring_flags =
          typeof empData?.hiring_flags !== "undefined"
            ? safeStringify(safeParse(empData.hiring_flags), {
                green_flags: [], red_flags: [],
              })
            : oldData[0].hiring_flags || null;

        const gates =
          typeof empData?.gates !== "undefined"
            ? safeStringify(safeParse(empData.gates), {
                competency_gates: [], performance_gates: [], behavioural_gates: [],
              })
            : oldData[0].gates || null;

        // ── Build users update object ─────────────────
        var users = {
          first_name: empData?.first_name,
          last_name: empData?.last_name,
          email: empData?.email,
          username: empData?.email,
          phone: empData?.phone != "" ? empData?.phone : "",
          shift_id: empData?.shift,
          active:
            parseInt(empData?.active) === 1 || parseInt(empData?.active) === 0
              ? parseInt(empData?.active)
              : 0,
          comp_id: comp_id,
          updated_by: parseInt(user_id),
          updated_at: now,
          dob: empData?.dob,
          profile_picture: profile_picture_url,
          resume: resume_url,

          // ── HR Profile fields ──
          employee_id: empData?.employee_id || null,
          job_title: empData?.job_title || null,
          sub_department: empData?.sub_department || null,
          employment_type: empData?.employment_type || "Full-Time",
          work_location: empData?.work_location || "On-Site",
          reporting_to: empData?.reporting_to || null,
          joining_date: empData?.date_of_joining || empData?.joining_date || null,
          probation_end_date: empData?.probation_end_date || null,
          job_overview: empData?.job_overview || null,

          // ── Role fields ──
          role_purpose: empData?.role_purpose || null,
          coordinates_with: empData?.coordinates_with || null,

          // ── Compensation fields ──
          ctc: empData?.ctc || null,
          basic_salary: empData?.basic_salary || null,
          hra: empData?.hra || null,
          allowances: empData?.allowances || null,
          bonus: empData?.bonus || null,
          pay_cycle: empData?.pay_cycle || "Monthly",
          pay_mode: empData?.pay_mode || "Bank Transfer",
          bank_account: empData?.bank_account || null,

          // ── Existing JSON columns ──
          authority_rights: authority_rights,
          deliverables: deliverables,
          growth_index: growth_index,
          risks_and_warning: risks_and_warning,

          // ── NEW JSON columns ──
          hiring_requirements: hiring_requirements,
          hiring_flags: hiring_flags,
          gates: gates,
        };

        // ── Optional password update ──────────────────
        if (
          typeof password !== "undefined" &&
          password?.trim().length > 0 &&
          password != null
        ) {
          const salt = bcrypt.genSaltSync(10);
          users["password"] = bcrypt.hashSync(password, salt);
        }

        // ── UPDATE users row ──────────────────────────
        db.query(
          "UPDATE `users` SET ? WHERE `id`=" + parseInt(id),
          users,
          function (err, result) {
            if (err) {
              console.log(err);
              newFiles.forEach((filePath) => unlinkSingleImage(filePath));
              return res
                .status(201)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            // ── Delete old files after successful DB update ──
            oldFiles.forEach((filePath) => {
              if (filePath) unlinkSingleImage(filePath);
            });

            // ════════════════════════════════════════════
            //  DEPARTMENTS
            // ════════════════════════════════════════════
            if (module.exports.verifyJson(empData?.departments)) {
              const incomingDeptIds = JSON.parse(empData.departments).map(
                (d) => parseInt(d),
              );

              db.query(
                "SELECT id, department_id FROM `user_department_post` WHERE `user_id` = ?",
                [parseInt(id)],
                (err, existingDepts) => {
                  if (err) {
                    console.error("[DEPT] fetch error:", err.sqlMessage);
                    return;
                  }

                  const existingDeptIds = existingDepts.map((r) => r.department_id);

                  const deptsToDelete = existingDepts.filter(
                    (r) => !incomingDeptIds.includes(r.department_id),
                  );
                  if (deptsToDelete.length > 0) {
                    db.query(
                      "DELETE FROM `user_department_post` WHERE `id` IN (?)",
                      [deptsToDelete.map((r) => r.id)],
                      (err) => {
                        if (err) console.error("[DEPT] delete error:", err.sqlMessage);
                        else console.log("[DEPT] deleted:", deptsToDelete.map((r) => r.department_id));
                      },
                    );
                  }

                  const deptsToInsert = incomingDeptIds.filter(
                    (dId) => !existingDeptIds.includes(dId),
                  );
                  deptsToInsert.forEach((department_id) => {
                    db.query(
                      "INSERT INTO `user_department_post` SET ?",
                      { user_id: parseInt(id), department_id, post_id: 1 },
                      (err) => {
                        if (err) console.error("[DEPT] insert error:", err.sqlMessage);
                        else console.log("[DEPT] inserted dept:", department_id, "for user:", id);
                      },
                    );
                  });
                },
              );
            }

            // ── Update roles ────────────────────────────
            if (typeof empData?.roles !== "undefined") {
              const newRoles = module.exports.verifyJson(empData?.roles)
                ? JSON.parse(empData?.roles).map((rid) => parseInt(rid))
                : [];

              db.query(
                `SELECT mst_group_id FROM users_groups WHERE mst_user_id = ?`,
                [id],
                (err, oldRolesData) => {
                  if (err) {
                    console.log("Error fetching old roles:", err);
                  } else {
                    const oldRoles = oldRolesData.map((r) => r.mst_group_id);
                    const areRolesSame =
                      oldRoles.length === newRoles.length &&
                      oldRoles.every((r) => newRoles.includes(r));

                    if (!areRolesSame) {
                      db.query(
                        `DELETE FROM users_groups WHERE mst_user_id = ?`,
                        [id],
                        (err) => {
                          if (err) {
                            console.log("Error deleting old roles:", err);
                          } else if (newRoles.length > 0) {
                            const insertValues = newRoles.map((roleId) => [id, roleId]);
                            db.query(
                              `INSERT INTO users_groups (mst_user_id, mst_group_id) VALUES ?`,
                              [insertValues],
                              (err) => {
                                if (err) console.log("Error inserting new roles:", err);
                              },
                            );
                          }
                        },
                      );
                    }
                  }
                },
              );
            }

            // ── Update schedule ─────────────────────────
            const scheduleEntries = Object.entries(schedule);
            if (scheduleEntries.length > 0) {
              db.query("DELETE FROM user_time WHERE user_id = ?", [id], (err) => {
                if (err) {
                  console.log("Error deleting old schedule:", err);
                } else {
                  const insertValues = scheduleEntries.map(
                    ([week, times]) => [id, week, times.from, times.to],
                  );
                  db.query(
                    "INSERT INTO user_time (user_id, week, from_time, to_time) VALUES ?",
                    [insertValues],
                    (err) => {
                      if (err) console.log("Error inserting schedule:", err);
                    },
                  );
                }
              });
            }

            // ════════════════════════════════════════════
            //  HR CHILD TABLES
            // ════════════════════════════════════════════

            // ── 1. Key Responsibilities ─────────────────
            if (typeof empData?.responsibilities !== "undefined") {
              const titles = safeParse(empData.responsibilities).filter(
                (r) => typeof r === "string" && r.trim(),
              );
              syncTitleTable(
                "emp_responsibilities",
                id,
                titles,
                (title) => ({ user_id: parseInt(id), comp_id, title, created_at: now }),
              );
            }

            // ── 2. Strengths ────────────────────────────
            if (typeof empData?.strengths !== "undefined") {
              const titles = safeParse(empData.strengths).filter(
                (r) => typeof r === "string" && r.trim(),
              );
              syncTitleTable(
                "emp_strengths",
                id,
                titles,
                (title) => ({ user_id: parseInt(id), title, created_at: now }),
              );
            }

            // ── 3. Weaknesses ───────────────────────────
            if (typeof empData?.weaknesses !== "undefined") {
              const titles = safeParse(empData.weaknesses).filter(
                (r) => typeof r === "string" && r.trim(),
              );
              syncTitleTable(
                "emp_weaknesses",
                id,
                titles,
                (title) => ({ user_id: parseInt(id), title, created_at: now }),
              );
            }

            // ── 4. Skills ───────────────────────────────
            if (typeof empData?.skills !== "undefined") {
              syncHrTable(
                "emp_skills",
                parseInt(id),
                safeParse(empData.skills).filter((s) => s?.name),
                (s) => ({
                  sql: "UPDATE `emp_skills` SET `name`=?, `level`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    s.name.trim(),
                    Math.min(100, Math.max(1, parseInt(s.level) || 80)),
                    comp_id,
                    parseInt(s.id),
                    parseInt(id),
                  ],
                }),
                (s) => ({
                  user_id: parseInt(id),
                  comp_id,
                  name: s.name.trim(),
                  level: Math.min(100, Math.max(1, parseInt(s.level) || 80)),
                  created_at: now,
                }),
              );
            }

            // ── 5. Work History ─────────────────────────
            if (typeof empData?.work_history !== "undefined") {
              syncHrTable(
                "emp_work_history",
                parseInt(id),
                safeParse(empData.work_history).filter((w) => w?.role && w?.company),
                (w) => ({
                  sql: "UPDATE `emp_work_history` SET `role`=?, `company`=?, `period`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    w.role.trim(),
                    w.company.trim(),
                    w.period?.trim() || null,
                    comp_id,
                    parseInt(w.id),
                    parseInt(id),
                  ],
                }),
                (w) => ({
                  user_id: parseInt(id),
                  comp_id,
                  role: w.role.trim(),
                  company: w.company.trim(),
                  period: w.period?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── 6. Education ────────────────────────────
            if (typeof empData?.education !== "undefined") {
              syncHrTable(
                "emp_education",
                parseInt(id),
                safeParse(empData.education).filter((e) => e?.degree && e?.institution),
                (e) => ({
                  sql: "UPDATE `emp_education` SET `degree`=?, `institution`=?, `year`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    e.degree.trim(),
                    e.institution.trim(),
                    e.year?.trim() || null,
                    comp_id,
                    parseInt(e.id),
                    parseInt(id),
                  ],
                }),
                (e) => ({
                  user_id: parseInt(id),
                  comp_id,
                  degree: e.degree.trim(),
                  institution: e.institution.trim(),
                  year: e.year?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── 7. Emergency Contacts ───────────────────
            if (typeof empData?.emergency_contacts !== "undefined") {
              syncHrTable(
                "emp_emergency_contacts",
                parseInt(id),
                safeParse(empData.emergency_contacts).filter((c) => c?.name && c?.phone),
                (c) => ({
                  sql: "UPDATE `emp_emergency_contacts` SET `name`=?, `relation`=?, `phone`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    c.name.trim(),
                    c.relation?.trim() || null,
                    c.phone.trim(),
                    comp_id,
                    parseInt(c.id),
                    parseInt(id),
                  ],
                }),
                (c) => ({
                  user_id: parseInt(id),
                  comp_id,
                  name: c.name.trim(),
                  relation: c.relation?.trim() || null,
                  phone: c.phone.trim(),
                  created_at: now,
                }),
              );
            }

            // ── 8. KPIs ─────────────────────────────────
            if (typeof empData?.kpis !== "undefined") {
              syncHrTable(
                "emp_kpis",
                parseInt(id),
                safeParse(empData.kpis).filter((k) => k?.metric && k.metric.trim()),
                (k) => ({
                  sql: "UPDATE `emp_kpis` SET `category`=?, `metric`=?, `target`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    k.category?.trim() || "Other",
                    k.metric.trim(),
                    k.target?.trim() || null,
                    comp_id,
                    parseInt(k.id),
                    parseInt(id),
                  ],
                }),
                (k) => ({
                  user_id: parseInt(id),
                  comp_id,
                  category: k.category?.trim() || "Other",
                  metric: k.metric.trim(),
                  target: k.target?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── NEW 9. Domain Knowledge ─────────────────
            if (typeof empData?.domain_knowledge !== "undefined") {
              syncHrTable(
                "emp_domain_knowledge",
                parseInt(id),
                safeParse(empData.domain_knowledge).filter((d) => d?.topic && d.topic.trim()),
                (d) => ({
                  sql: "UPDATE `emp_domain_knowledge` SET `topic`=?, `level`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    d.topic.trim(),
                    d.level?.trim() || "Working",
                    comp_id,
                    parseInt(d.id),
                    parseInt(id),
                  ],
                }),
                (d) => ({
                  user_id: parseInt(id),
                  comp_id,
                  topic: d.topic.trim(),
                  level: d.level?.trim() || "Working",
                  created_at: now,
                }),
              );
            }

            // ── NEW 10. Software & Tools ────────────────
            if (typeof empData?.software_tools !== "undefined") {
              syncHrTable(
                "emp_software_tools",
                parseInt(id),
                safeParse(empData.software_tools).filter((s) => s?.tool && s.tool.trim()),
                (s) => ({
                  sql: "UPDATE `emp_software_tools` SET `tool`=?, `level`=?, `note`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    s.tool.trim(),
                    s.level?.trim() || "Proficient",
                    s.note?.trim() || null,
                    comp_id,
                    parseInt(s.id),
                    parseInt(id),
                  ],
                }),
                (s) => ({
                  user_id: parseInt(id),
                  comp_id,
                  tool: s.tool.trim(),
                  level: s.level?.trim() || "Proficient",
                  note: s.note?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── NEW 11. Behavioural Competencies ────────
            if (typeof empData?.behavioural_competencies !== "undefined") {
              syncHrTable(
                "emp_behavioural_competencies",
                parseInt(id),
                safeParse(empData.behavioural_competencies).filter((c) => c?.competency && c.competency.trim()),
                (c) => ({
                  sql: "UPDATE `emp_behavioural_competencies` SET `competency`=?, `description`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    c.competency.trim(),
                    c.description?.trim() || null,
                    comp_id,
                    parseInt(c.id),
                    parseInt(id),
                  ],
                }),
                (c) => ({
                  user_id: parseInt(id),
                  comp_id,
                  competency: c.competency.trim(),
                  description: c.description?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── NEW 12. KRAs ────────────────────────────
            if (typeof empData?.kras !== "undefined") {
              syncHrTable(
                "emp_kras",
                parseInt(id),
                safeParse(empData.kras).filter((k) => k?.kra && k.kra.trim()),
                (k) => ({
                  sql: "UPDATE `emp_kras` SET `kra`=?, `target`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    k.kra.trim(),
                    k.target?.trim() || null,
                    comp_id,
                    parseInt(k.id),
                    parseInt(id),
                  ],
                }),
                (k) => ({
                  user_id: parseInt(id),
                  comp_id,
                  kra: k.kra.trim(),
                  target: k.target?.trim() || null,
                  created_at: now,
                }),
              );
            }

            // ── NEW 13. System / Software Module Duties ──
            if (typeof empData?.system_duties !== "undefined") {
              syncHrTable(
                "emp_system_duties",
                parseInt(id),
                safeParse(empData.system_duties).filter((s) => s?.module && s?.duty),
                (s) => ({
                  sql: "UPDATE `emp_system_duties` SET `module`=?, `duty`=?, `frequency`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    s.module.trim(),
                    s.duty.trim(),
                    s.frequency?.trim() || "Daily",
                    comp_id,
                    parseInt(s.id),
                    parseInt(id),
                  ],
                }),
                (s) => ({
                  user_id: parseInt(id),
                  comp_id,
                  module: s.module.trim(),
                  duty: s.duty.trim(),
                  frequency: s.frequency?.trim() || "Daily",
                  created_at: now,
                }),
              );
            }

            // ── NEW 14. Career Growth Path ───────────────
            if (typeof empData?.career_growth !== "undefined") {
              syncHrTable(
                "emp_career_growth",
                parseInt(id),
                safeParse(empData.career_growth).filter((c) => c?.title && c.title.trim()),
                (c) => ({
                  sql: "UPDATE `emp_career_growth` SET `grade`=?, `title`=?, `condition_text`=?, `sort_order`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    c.grade?.trim() || null,
                    c.title.trim(),
                    c.condition?.trim() || null,
                    parseInt(c.sort_order) || 0,
                    comp_id,
                    parseInt(c.id),
                    parseInt(id),
                  ],
                }),
                (c, idx) => ({
                  user_id: parseInt(id),
                  comp_id,
                  grade: c.grade?.trim() || null,
                  title: c.title.trim(),
                  condition_text: c.condition?.trim() || null,
                  sort_order: idx || 0,
                  created_at: now,
                }),
              );
            }

            // ── NEW 15. STOP Meeting Duties ──────────────
            if (typeof empData?.stop_meeting_duties !== "undefined") {
              syncHrTable(
                "emp_stop_meeting_duties",
                parseInt(id),
                safeParse(empData.stop_meeting_duties).filter((s) => s?.duty && s.duty.trim()),
                (s) => ({
                  sql: "UPDATE `emp_stop_meeting_duties` SET `meeting_type`=?, `duty`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
                  params: [
                    s.meeting_type?.trim() || "Operational (Daily)",
                    s.duty.trim(),
                    comp_id,
                    parseInt(s.id),
                    parseInt(id),
                  ],
                }),
                (s) => ({
                  user_id: parseInt(id),
                  comp_id,
                  meeting_type: s.meeting_type?.trim() || "Operational (Daily)",
                  duty: s.duty.trim(),
                  created_at: now,
                }),
              );
            }

            // ── Done ────────────────────────────────────
            return res.status(201).json({
              error: false,
              message: "Changes saved!",
              data: {},
            });
          },
        );
      });
    });
  } catch (err) {
    console.log(err);
    if (req?.file) unlinkSingleImage(getImageWithFoldername(req?.file?.path));
    return res
      .status(201)
      .json({ error: true, message: "Invalid request", data: {} });
  }
},



  
//   update: function (req, res) {
//   try {
//     const empData = JSON.parse(JSON.stringify(req?.body));
//     console.log("===>", req?.files);

//     var oldFiles = [];
//     var newFiles = [];
//     var profile_picture = "";
//     var resume = "";

//     if (req.files.length > 0) {
//       req.files.forEach((f) => {
//         if (f.fieldname === "profile_picture") {
//           profile_picture = getImageWithFoldername(f.path);
//           newFiles.push(profile_picture);
//         } else if (f.fieldname === "resume") {
//           resume = getImageWithFoldername(f.path);
//           newFiles.push(resume);
//         } else {
//           unlinkSingleImage(getImageWithFoldername(f.path));
//         }
//       });
//     }

//     var id = empData?.id;
//     var email = empData?.email;
//     let password = empData?.password;

//     // ── Validations ───────────────────────────────────────
//     req.assert("id", "Employee Id required.").notEmpty();
//     req.assert("first_name", "First name required.").notEmpty();
//     req.assert("last_name", "Last name required.").notEmpty();
//     if (typeof empData?.phone != "undefined" && empData?.phone != "") {
//       req.assert("phone", "Mobile should be number.").isNumeric();
//       req
//         .assert("phone", "Mobile length should be 10 digit.")
//         .isLength({ min: 10, max: 10 });
//     }
//     req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
//     req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();

//     var errors = req.validationErrors();
//     if (errors) {
//       return res
//         .status(201)
//         .send({ error: true, message: errors[0].msg, data: {} });
//     }

//     const user_id = req?.user?.id;
//     const comp_id = req?.user?.comp_id ? parseInt(req.user.comp_id) : 1;
//     const schedule = JSON.parse(req.body.schedule || "{}");
//     const now = getCurrentDateAndTime();

//     // ═══════════════════════════════════════════════════════
//     //  SYNC HELPER — HR child tables
//     //  • row has id   → UPDATE
//     //  • row no id    → INSERT
//     //  • db row not in incoming → DELETE
//     // ═══════════════════════════════════════════════════════
//     function syncHrTable(table, userId, incomingRows, buildUpdateSql, buildInsertRow) {
//       db.query(
//         `SELECT id FROM \`${table}\` WHERE user_id = ?`,
//         [userId],
//         (err, dbRows) => {
//           if (err) {
//             console.error(`[HR] ${table} fetch error:`, err.sqlMessage);
//             return;
//           }

//           const dbIds = dbRows.map((r) => r.id);
//           const incomingIds = incomingRows
//             .filter((r) => r.id)
//             .map((r) => parseInt(r.id));

//           const toDelete = dbIds.filter((dbId) => !incomingIds.includes(dbId));
//           if (toDelete.length > 0) {
//             db.query(
//               `DELETE FROM \`${table}\` WHERE id IN (?) AND user_id = ?`,
//               [toDelete, userId],
//               (err) => {
//                 if (err) console.error(`[HR] ${table} delete error:`, err.sqlMessage);
//               },
//             );
//           }

//           incomingRows
//             .filter((r) => r.id)
//             .forEach((r) => {
//               const { sql, params } = buildUpdateSql(r);
//               db.query(sql, params, (err) => {
//                 if (err) console.error(`[HR] ${table} update error:`, err.sqlMessage);
//               });
//             });

//           incomingRows
//             .filter((r) => !r.id)
//             .forEach((r) => {
//               db.query(
//                 `INSERT INTO \`${table}\` SET ?`,
//                 buildInsertRow(r),
//                 (err) => {
//                   if (err) console.error(`[HR] ${table} insert error:`, err.sqlMessage);
//                 },
//               );
//             });
//         },
//       );
//     }

//     // ── Check duplicate email ─────────────────────────────
//     var sqlEmail =
//       "SELECT * FROM `users` WHERE `email`= '" +
//       email +
//       "' and id!='" +
//       id +
//       "' and `isdeleted`=0";

//     db.query(sqlEmail, function (err, result) {
//       if (err) {
//         console.log(err);
//         return res
//           .status(201)
//           .json({ error: true, message: err.sqlMessage, data: {} });
//       } else if (result.length > 0) {
//         return res
//           .status(201)
//           .json({ error: true, message: "Email already exists", data: {} });
//       }

//       // ── Fetch existing user row ───────────────────────
//       var sqlOld = "SELECT * FROM `users` WHERE `id`='" + id + "'";
//       db.query(sqlOld, (err, oldData) => {
//         if (err) {
//           return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
//         }
//         if (!oldData || oldData.length === 0) {
//           return res.status(201).json({ error: true, message: "Employee not found.", data: {} });
//         }

//         profile_picture
//           ? oldFiles.push(oldData[0].profile_picture)
//           : (profile_picture = oldData[0].profile_picture);
//         resume
//           ? oldFiles.push(oldData[0].resume)
//           : (resume = oldData[0].resume);

//         const profile_picture_url = profile_picture;
//         const resume_url = resume;

//         // ── Parse new JSON fields safely ────────────────
//         // For each JSON field: if the key was NOT sent in the request body,
//         // preserve the existing DB value so a partial update doesn't wipe it.

//         const authority_rights =
//           typeof empData?.authority_rights !== "undefined"
//             ? safeStringify(safeParse(empData.authority_rights), {
//                 can_decide: [],
//                 must_escalate: [],
//                 cannot_decide: [],
//               })
//             : oldData[0].authority_rights || null;

//         const deliverables =
//           typeof empData?.deliverables !== "undefined"
//             ? safeStringify(safeParse(empData.deliverables), {
//                 daily: [],
//                 weekly: [],
//                 monthly: [],
//               })
//             : oldData[0].deliverables || null;

//         const growth_index =
//           typeof empData?.growth_index !== "undefined"
//             ? safeStringify(safeParse(empData.growth_index), {
//                 current_zone: "",
//                 target_zone: "",
//                 top_level_criteria: [],
//               })
//             : oldData[0].growth_index || null;

//         const risks_and_warning =
//           typeof empData?.risks_and_warning !== "undefined"
//             ? safeStringify(safeParse(empData.risks_and_warning), {
//                 risk_flags: [],
//                 stage_1: "",
//                 stage_2: "",
//                 stage_3: "",
//                 not_responsible: [],
//               })
//             : oldData[0].risks_and_warning || null;

//         // ── Build users update object ─────────────────
//         var users = {
//           first_name: empData?.first_name,
//           last_name: empData?.last_name,
//           email: empData?.email,
//           username: empData?.email,
//           phone: empData?.phone != "" ? empData?.phone : "",
//           shift_id: empData?.shift,
//           active:
//             parseInt(empData?.active) === 1 || parseInt(empData?.active) === 0
//               ? parseInt(empData?.active)
//               : 0,
//           comp_id: comp_id,
//           updated_by: parseInt(user_id),
//           updated_at: now,
//           dob: empData?.dob,
//           profile_picture: profile_picture_url,
//           resume: resume_url,

//           // ── HR Profile fields ──
//           employee_id: empData?.employee_id || null,
//           job_title: empData?.job_title || null,
//           sub_department: empData?.sub_department || null,
//           employment_type: empData?.employment_type || "Full-Time",
//           work_location: empData?.work_location || "On-Site",
//           reporting_to: empData?.reporting_to || null,
//           joining_date: empData?.date_of_joining || empData?.joining_date || null,
//           probation_end_date: empData?.probation_end_date || null,
//           job_overview: empData?.job_overview || null,

//           // ── NEW: Role fields ──
//           role_purpose: empData?.role_purpose || null,
//           coordinates_with: empData?.coordinates_with || null,

//           // ── Compensation fields ──
//           ctc: empData?.ctc || null,
//           basic_salary: empData?.basic_salary || null,
//           hra: empData?.hra || null,
//           allowances: empData?.allowances || null,
//           bonus: empData?.bonus || null,
//           pay_cycle: empData?.pay_cycle || "Monthly",
//           pay_mode: empData?.pay_mode || "Bank Transfer",
//           bank_account: empData?.bank_account || null,

//           // ── NEW: JSON columns (preserve existing if not sent) ──
//           authority_rights: authority_rights,
//           deliverables: deliverables,
//           growth_index: growth_index,
//           risks_and_warning: risks_and_warning,
//         };

//         // ── Optional password update ──────────────────
//         if (
//           typeof password !== "undefined" &&
//           password?.trim().length > 0 &&
//           password != null
//         ) {
//           const salt = bcrypt.genSaltSync(10);
//           users["password"] = bcrypt.hashSync(password, salt);
//         }

//         // ── UPDATE users row ──────────────────────────
//         db.query(
//           "UPDATE `users` SET ? WHERE `id`=" + parseInt(id),
//           users,
//           function (err, result) {
//             if (err) {
//               console.log(err);
//               newFiles.forEach((filePath) => unlinkSingleImage(filePath));
//               return res
//                 .status(201)
//                 .json({ error: true, message: err.sqlMessage, data: {} });
//             }

//             // ── Delete old files after successful DB update ──
//             oldFiles.forEach((filePath) => {
//               if (filePath) unlinkSingleImage(filePath);
//             });

//             // ════════════════════════════════════════════
//             //  DEPARTMENTS
//             // ════════════════════════════════════════════
//             if (module.exports.verifyJson(empData?.departments)) {
//               const incomingDeptIds = JSON.parse(empData.departments).map(
//                 (d) => parseInt(d),
//               );

//               db.query(
//                 "SELECT id, department_id FROM `user_department_post` WHERE `user_id` = ?",
//                 [parseInt(id)],
//                 (err, existingDepts) => {
//                   if (err) {
//                     console.error("[DEPT] fetch error:", err.sqlMessage);
//                     return;
//                   }

//                   const existingDeptIds = existingDepts.map((r) => r.department_id);

//                   const deptsToDelete = existingDepts.filter(
//                     (r) => !incomingDeptIds.includes(r.department_id),
//                   );
//                   if (deptsToDelete.length > 0) {
//                     db.query(
//                       "DELETE FROM `user_department_post` WHERE `id` IN (?)",
//                       [deptsToDelete.map((r) => r.id)],
//                       (err) => {
//                         if (err) console.error("[DEPT] delete error:", err.sqlMessage);
//                         else console.log("[DEPT] deleted:", deptsToDelete.map((r) => r.department_id));
//                       },
//                     );
//                   }

//                   const deptsToInsert = incomingDeptIds.filter(
//                     (dId) => !existingDeptIds.includes(dId),
//                   );
//                   deptsToInsert.forEach((department_id) => {
//                     db.query(
//                       "INSERT INTO `user_department_post` SET ?",
//                       { user_id: parseInt(id), department_id, post_id: 1 },
//                       (err) => {
//                         if (err) console.error("[DEPT] insert error:", err.sqlMessage);
//                         else console.log("[DEPT] inserted dept:", department_id, "for user:", id);
//                       },
//                     );
//                   });
//                 },
//               );
//             }

//             // ── Update roles ────────────────────────────
//             if (typeof empData?.roles !== "undefined") {
//               const newRoles = module.exports.verifyJson(empData?.roles)
//                 ? JSON.parse(empData?.roles).map((rid) => parseInt(rid))
//                 : [];

//               db.query(
//                 `SELECT mst_group_id FROM users_groups WHERE mst_user_id = ?`,
//                 [id],
//                 (err, oldRolesData) => {
//                   if (err) {
//                     console.log("Error fetching old roles:", err);
//                   } else {
//                     const oldRoles = oldRolesData.map((r) => r.mst_group_id);
//                     const areRolesSame =
//                       oldRoles.length === newRoles.length &&
//                       oldRoles.every((r) => newRoles.includes(r));

//                     if (!areRolesSame) {
//                       db.query(
//                         `DELETE FROM users_groups WHERE mst_user_id = ?`,
//                         [id],
//                         (err) => {
//                           if (err) {
//                             console.log("Error deleting old roles:", err);
//                           } else if (newRoles.length > 0) {
//                             const insertValues = newRoles.map((roleId) => [id, roleId]);
//                             db.query(
//                               `INSERT INTO users_groups (mst_user_id, mst_group_id) VALUES ?`,
//                               [insertValues],
//                               (err) => {
//                                 if (err) console.log("Error inserting new roles:", err);
//                               },
//                             );
//                           }
//                         },
//                       );
//                     }
//                   }
//                 },
//               );
//             }

//             // ── Update schedule ─────────────────────────
//             const scheduleEntries = Object.entries(schedule);
//             if (scheduleEntries.length > 0) {
//               db.query("DELETE FROM user_time WHERE user_id = ?", [id], (err) => {
//                 if (err) {
//                   console.log("Error deleting old schedule:", err);
//                 } else {
//                   const insertValues = scheduleEntries.map(
//                     ([week, times]) => [id, week, times.from, times.to],
//                   );
//                   db.query(
//                     "INSERT INTO user_time (user_id, week, from_time, to_time) VALUES ?",
//                     [insertValues],
//                     (err) => {
//                       if (err) console.log("Error inserting schedule:", err);
//                     },
//                   );
//                 }
//               });
//             }

//             // ════════════════════════════════════════════
//             //  HR CHILD TABLES — title-based (no id on rows)
//             //  Only sync if field was sent in the request.
//             // ════════════════════════════════════════════

//             // ── 1. Key Responsibilities ─────────────────
//             if (typeof empData?.responsibilities !== "undefined") {
//               const responsibilities = safeParse(empData.responsibilities).filter(
//                 (r) => typeof r === "string" && r.trim(),
//               );

//               db.query(
//                 `SELECT id, title FROM \`emp_responsibilities\` WHERE user_id = ?`,
//                 [parseInt(id)],
//                 (err, dbResps) => {
//                   if (err) {
//                     console.error("[HR] responsibilities fetch error:", err.sqlMessage);
//                     return;
//                   }

//                   const dbTitles = dbResps.map((r) => r.title);
//                   const incomingTitles = responsibilities.map((r) => r.trim());

//                   const toDelete = dbResps.filter((r) => !incomingTitles.includes(r.title));
//                   if (toDelete.length > 0) {
//                     db.query(
//                       `DELETE FROM \`emp_responsibilities\` WHERE id IN (?) AND user_id = ?`,
//                       [toDelete.map((r) => r.id), parseInt(id)],
//                       (err) => {
//                         if (err) console.error("[HR] responsibilities delete error:", err.sqlMessage);
//                       },
//                     );
//                   }

//                   incomingTitles
//                     .filter((t) => !dbTitles.includes(t))
//                     .forEach((title) => {
//                       db.query(
//                         `INSERT INTO \`emp_responsibilities\` SET ?`,
//                         { user_id: parseInt(id), comp_id, title, created_at: now },
//                         (err) => {
//                           if (err) console.error("[HR] responsibilities insert error:", err.sqlMessage);
//                         },
//                       );
//                     });
//                 },
//               );
//             }

//             // ── 2. Strengths ────────────────────────────
//             if (typeof empData?.strengths !== "undefined") {
//               const strengthTitles = safeParse(empData.strengths).filter(
//                 (r) => typeof r === "string" && r.trim(),
//               );

//               db.query(
//                 `SELECT id, title FROM \`emp_strengths\` WHERE user_id = ?`,
//                 [parseInt(id)],
//                 (err, dbResps) => {
//                   if (err) {
//                     console.error("[HR] strength fetch error:", err.sqlMessage);
//                     return;
//                   }

//                   const dbTitles = dbResps.map((r) => r.title);
//                   const incomingTitles = strengthTitles.map((r) => r.trim());

//                   const toDelete = dbResps.filter((r) => !incomingTitles.includes(r.title));
//                   if (toDelete.length > 0) {
//                     db.query(
//                       `DELETE FROM \`emp_strengths\` WHERE id IN (?) AND user_id = ?`,
//                       [toDelete.map((r) => r.id), parseInt(id)],
//                       (err) => {
//                         if (err) console.error("[HR] strength delete error:", err.sqlMessage);
//                       },
//                     );
//                   }

//                   incomingTitles
//                     .filter((t) => !dbTitles.includes(t))
//                     .forEach((title) => {
//                       db.query(
//                         `INSERT INTO \`emp_strengths\` SET ?`,
//                         { user_id: parseInt(id), title, created_at: now },
//                         (err) => {
//                           if (err) console.error("[HR] strength insert error:", err.sqlMessage);
//                         },
//                       );
//                     });
//                 },
//               );
//             }

//             // ── 3. Weaknesses ───────────────────────────
//             if (typeof empData?.weaknesses !== "undefined") {
//               const weaknessTitles = safeParse(empData.weaknesses).filter(
//                 (r) => typeof r === "string" && r.trim(),
//               );

//               db.query(
//                 `SELECT id, title FROM \`emp_weaknesses\` WHERE user_id = ?`,
//                 [parseInt(id)],
//                 (err, dbResps) => {
//                   if (err) {
//                     console.error("[HR] weakness fetch error:", err.sqlMessage);
//                     return;
//                   }

//                   const dbTitles = dbResps.map((r) => r.title);
//                   const incomingTitles = weaknessTitles.map((r) => r.trim());

//                   const toDelete = dbResps.filter((r) => !incomingTitles.includes(r.title));
//                   if (toDelete.length > 0) {
//                     db.query(
//                       `DELETE FROM \`emp_weaknesses\` WHERE id IN (?) AND user_id = ?`,
//                       [toDelete.map((r) => r.id), parseInt(id)],
//                       (err) => {
//                         if (err) console.error("[HR] weakness delete error:", err.sqlMessage);
//                       },
//                     );
//                   }

//                   incomingTitles
//                     .filter((t) => !dbTitles.includes(t))
//                     .forEach((title) => {
//                       db.query(
//                         `INSERT INTO \`emp_weaknesses\` SET ?`,
//                         { user_id: parseInt(id), title, created_at: now },
//                         (err) => {
//                           if (err) console.error("[HR] weakness insert error:", err.sqlMessage);
//                         },
//                       );
//                     });
//                 },
//               );
//             }

//             // ── 4. Skills ───────────────────────────────
//             if (typeof empData?.skills !== "undefined") {
//               syncHrTable(
//                 "emp_skills",
//                 parseInt(id),
//                 safeParse(empData.skills).filter((s) => s?.name),
//                 (s) => ({
//                   sql: "UPDATE `emp_skills` SET `name`=?, `level`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
//                   params: [
//                     s.name.trim(),
//                     Math.min(100, Math.max(1, parseInt(s.level) || 80)),
//                     comp_id,
//                     parseInt(s.id),
//                     parseInt(id),
//                   ],
//                 }),
//                 (s) => ({
//                   user_id: parseInt(id),
//                   comp_id,
//                   name: s.name.trim(),
//                   level: Math.min(100, Math.max(1, parseInt(s.level) || 80)),
//                   created_at: now,
//                 }),
//               );
//             }

//             // ── 5. Work History ─────────────────────────
//             if (typeof empData?.work_history !== "undefined") {
//               syncHrTable(
//                 "emp_work_history",
//                 parseInt(id),
//                 safeParse(empData.work_history).filter((w) => w?.role && w?.company),
//                 (w) => ({
//                   sql: "UPDATE `emp_work_history` SET `role`=?, `company`=?, `period`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
//                   params: [
//                     w.role.trim(),
//                     w.company.trim(),
//                     w.period?.trim() || null,
//                     comp_id,
//                     parseInt(w.id),
//                     parseInt(id),
//                   ],
//                 }),
//                 (w) => ({
//                   user_id: parseInt(id),
//                   comp_id,
//                   role: w.role.trim(),
//                   company: w.company.trim(),
//                   period: w.period?.trim() || null,
//                   created_at: now,
//                 }),
//               );
//             }

//             // ── 6. Education ────────────────────────────
//             if (typeof empData?.education !== "undefined") {
//               syncHrTable(
//                 "emp_education",
//                 parseInt(id),
//                 safeParse(empData.education).filter((e) => e?.degree && e?.institution),
//                 (e) => ({
//                   sql: "UPDATE `emp_education` SET `degree`=?, `institution`=?, `year`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
//                   params: [
//                     e.degree.trim(),
//                     e.institution.trim(),
//                     e.year?.trim() || null,
//                     comp_id,
//                     parseInt(e.id),
//                     parseInt(id),
//                   ],
//                 }),
//                 (e) => ({
//                   user_id: parseInt(id),
//                   comp_id,
//                   degree: e.degree.trim(),
//                   institution: e.institution.trim(),
//                   year: e.year?.trim() || null,
//                   created_at: now,
//                 }),
//               );
//             }

//             // ── 7. Emergency Contacts ───────────────────
//             if (typeof empData?.emergency_contacts !== "undefined") {
//               syncHrTable(
//                 "emp_emergency_contacts",
//                 parseInt(id),
//                 safeParse(empData.emergency_contacts).filter((c) => c?.name && c?.phone),
//                 (c) => ({
//                   sql: "UPDATE `emp_emergency_contacts` SET `name`=?, `relation`=?, `phone`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
//                   params: [
//                     c.name.trim(),
//                     c.relation?.trim() || null,
//                     c.phone.trim(),
//                     comp_id,
//                     parseInt(c.id),
//                     parseInt(id),
//                   ],
//                 }),
//                 (c) => ({
//                   user_id: parseInt(id),
//                   comp_id,
//                   name: c.name.trim(),
//                   relation: c.relation?.trim() || null,
//                   phone: c.phone.trim(),
//                   created_at: now,
//                 }),
//               );
//             }

//             // ── NEW 8. KPIs ─────────────────────────────
//             // Uses syncHrTable — rows with an id are updated,
//             // rows without an id are inserted, missing rows are deleted.
//             if (typeof empData?.kpis !== "undefined") {
//               syncHrTable(
//                 "emp_kpis",
//                 parseInt(id),
//                 safeParse(empData.kpis).filter((k) => k?.metric && k.metric.trim()),
//                 (k) => ({
//                   sql: "UPDATE `emp_kpis` SET `category`=?, `metric`=?, `target`=?, `comp_id`=? WHERE `id`=? AND `user_id`=?",
//                   params: [
//                     k.category?.trim() || "Other",
//                     k.metric.trim(),
//                     k.target?.trim() || null,
//                     comp_id,
//                     parseInt(k.id),
//                     parseInt(id),
//                   ],
//                 }),
//                 (k) => ({
//                   user_id: parseInt(id),
//                   comp_id,
//                   category: k.category?.trim() || "Other",
//                   metric: k.metric.trim(),
//                   target: k.target?.trim() || null,
//                   created_at: now,
//                 }),
//               );
//             }

//             // ── Done ────────────────────────────────────
//             return res.status(201).json({
//               error: false,
//               message: "Changes saved!",
//               data: {},
//             });
//           },
//         );
//       });
//     });
//   } catch (err) {
//     console.log(err);
//     if (req?.file) unlinkSingleImage(getImageWithFoldername(req?.file?.path));
//     return res
//       .status(201)
//       .json({ error: true, message: "Invalid request", data: {} });
//   }
// },



  
  delete: function (req, res) {
    var id = req.body.id;
    req.assert("id", "Employee Id required.").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      const user_id = req.user.id;
      const comp_id = req.user.comp_id;

      var sql =
        "UPDATE `users` SET `isdeleted`=1,`updated_by`=" +
        parseInt(user_id) +
        ",`updated_at`='" +
        getCurrentDateAndTime() +
        "' WHERE `id`=" +
        id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          res.status(201).json({
            error: false,
            message: "Employee has been Removed!",
            data: {},
          });
        }
      });
    }
  },
  verifyJson: (jsonString) => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (err) {
      return false;
    }
  },
  demo_query: (req, res) => {
    try {
      res.status(200).json({ message: "Something went wrong", error: true });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Something went wrong", error: true });
    }
  },

  addShifts: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const shiftData = {
      name: this_data.name,
      created_at: getCurrentDateAndTime(),
      is_deleted: 0,
    };

    db.query("INSERT INTO shifts SET ?", shiftData, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const shiftId = result.insertId;

      // Prepare schedule data for bulk insert
      const scheduleEntries = [];
      for (const [day, times] of Object.entries(this_data.schedule)) {
        if (times.from || times.to) {
          scheduleEntries.push([
            shiftId,
            day,
            times.from || null,
            times.to || null,
          ]);
        }
      }

      if (scheduleEntries.length > 0) {
        const sql =
          "INSERT INTO user_time (shift_id, week, from_time, to_time) VALUES ?";
        db.query(sql, [scheduleEntries], function (err2) {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage, data: {} });
          }

          return res.status(201).json({
            error: false,
            message: "Shift and schedule have been added successfully.",
            data: {
              id: shiftId,
            },
          });
        });
      } else {
        // No schedule entries, just return success for the shift
        return res.status(201).json({
          error: false,
          message: "Shift has been added successfully (no schedule).",
          data: {
            id: shiftId,
          },
        });
      }
    });
  },

  getShiftList: (req, res) => {
    var sql = "select id,name from shifts where is_deleted = 0";
    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record Fetch", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },

  getShiftbyid: (req, res) => {
    const Id = req.params.id;
    const sql = `
      SELECT s.id as shift_id, s.name as shift_name,
             ut.id as schedule_id, ut.week, ut.from_time, ut.to_time
      FROM shifts as s
      LEFT JOIN user_time as ut ON ut.shift_id = s.id
      WHERE s.id = ?
    `;

    db.query(sql, [Id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const shift = {
          id: result[0].shift_id,
          name: result[0].shift_name,
          schedule: result.map((row) => ({
            id: row.schedule_id,
            week: row.week,
            from_time: row.from_time,
            to_time: row.to_time,
          })),
        };

        return res.status(200).json({
          error: false,
          message: "Record Fetch",
          data: shift,
        });
      } else {
        return res.status(404).json({
          error: false,
          message: "Not found",
          data: {},
        });
      }
    });
  },

  updateShifts: function (req, res) {
    const shiftId = req.body.id;
    const this_data = req.body;

    console.log("shiftId", shiftId);

    const shiftData = {
      name: this_data.name,
      updated_at: getCurrentDateAndTime(),
    };

    db.query(
      "UPDATE shifts SET ? WHERE id = ?",
      [shiftData, shiftId],
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (!this_data.schedule) {
          return res.status(200).json({
            error: false,
            message: "Shift name updated successfully (schedule unchanged).",
            data: { id: shiftId },
          });
        }

        // 2. Check if schedule exists for this shift
        db.query(
          "SELECT id FROM user_time WHERE shift_id = ?",
          [shiftId],
          function (err2, rows) {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            // Prepare new schedule entries with created_at
            const scheduleEntries = [];
            for (const [day, times] of Object.entries(this_data.schedule)) {
              if (times.from || times.to) {
                scheduleEntries.push([
                  shiftId,
                  day,
                  times.from || null,
                  times.to || null,
                ]);
              }
            }

            if (scheduleEntries.length === 0) {
              return res.status(200).json({
                error: false,
                message: "Shift updated successfully (no schedule provided).",
                data: { id: shiftId },
              });
            }

            // If existing schedules found → delete then insert
            if (rows.length > 0) {
              db.query(
                "DELETE FROM user_time WHERE shift_id = ?",
                [shiftId],
                function (err3) {
                  if (err3) {
                    return res.status(500).json({
                      error: true,
                      message: err3.sqlMessage,
                      data: {},
                    });
                  }
                  insertSchedule(scheduleEntries, shiftId, res);
                },
              );
            } else {
              insertSchedule(scheduleEntries, shiftId, res);
            }
          },
        );
      },
    );

    // Helper to insert schedule
    function insertSchedule(scheduleEntries, shiftId, res) {
      console.log("scheduleEntries", scheduleEntries);
      const sql =
        "INSERT INTO user_time (shift_id, week, from_time, to_time) VALUES ?";
      db.query(sql, [scheduleEntries], function (err) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        return res.status(200).json({
          error: false,
          message: "Shift and schedule updated successfully.",
          data: { id: shiftId },
        });
      });
    }
  },

  deleteShifts: function (req, res) {
    const ShiftId = req.body.id;


    const id = req.user.id;

    var sql =
      "UPDATE `shifts` SET `is_deleted`=1,`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      ShiftId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Shift has been marked as deleted!",
          data: {},
        });
      }
    });
  },


};
