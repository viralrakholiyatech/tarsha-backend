const { getImageWithFoldername } = require("../../services/FileService");
// ─── Put this at the top of your controller file ───────────────────────────
const archCache = {
  all: { data: null, lastFetched: null },
  basic: { data: null, lastFetched: null },
  study: { data: null, lastFetched: null },
  quotation: { data: null, lastFetched: null },
  designconcept: { data: null, lastFetched: null },
  consultants: { data: null, lastFetched: null },
  drawings: { data: null, lastFetched: null },
  schedule: { data: null, lastFetched: null },
  risk: { data: null, lastFetched: null },
  TTL: 60 * 1000, // 60 seconds
  isFetching: {},
};

// ─── Shared helpers ─────────────────────────────────────────────────────────
const queryAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

const getCached = async (key, fetchFn) => {
  const now = Date.now();
  const entry = archCache[key];

  // Serve from cache if fresh
  if (entry.data && now - entry.lastFetched < archCache.TTL) {
    return entry.data;
  }

  // Wait if already fetching
  if (archCache.isFetching[key]) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!archCache.isFetching[key]) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    return archCache[key].data;
  }

  archCache.isFetching[key] = true;
  try {
    const data = await fetchFn();
    archCache[key].data = data;
    archCache[key].lastFetched = Date.now();
    archCache.isFetching[key] = false;
    return data;
  } catch (e) {
    archCache.isFetching[key] = false;
    throw e;
  }
};

// ─── Shared SQL builder for stage tabs ──────────────────────────────────────
// All 7 stage tabs (basic/study/quotation etc.) are identical except for:
//   - project_name filter value
//   - which stage table is joined
//   - which status column is selected
const buildStageQuery = (stageJoin, statusCol, projectNameId) => `
  SELECT 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
    nmf.b_no, nmf.rs_no, nmf.address, nmf.authority, nmf.tentative_design,
    nmf.google_location,
    mc.name AS projectType, mpt.title AS category, v.name AS village,
    u.first_name AS client_name, tp.tpscheme,
    mid.title AS landtype,
    ah.first_name AS hod_name, ah.profile_picture AS hod_profile,
    GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
    GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
    GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
    ${statusCol},
    nmfd.completed_by, nmfd.assign_on, nmfd.days,
    CASE 
      WHEN CURDATE() < nmfd.assign_on THEN NULL
      WHEN latest.latest_status_at IS NOT NULL 
        THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
      ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status, latest.latest_status_at
  FROM new_mst_file AS nmf
  LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  LEFT JOIN village AS v ON v.id = nmf.village
  LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  LEFT JOIN users AS u ON u.id = nmf.client_id
  LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  LEFT JOIN users AS au 
    ON nmfd.assign_members IS NOT NULL
    AND JSON_VALID(nmfd.assign_members)
    AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
  ${stageJoin}
  LEFT JOIN (
    SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
    FROM todos t1
    INNER JOIN (
      SELECT file_id, MAX(status_at) AS max_status_at
      FROM todos GROUP BY file_id
    ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  ) latest ON latest.file_id = nmfd.id
  WHERE nmfpd.is_deleted = 0
    AND nmfpd.application_name = 'architecture_design'
    AND nmfd.source_type = 2
    AND nmfd.project_name = ${projectNameId}
    AND nmfd.is_deleted = 0
  GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
    nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
    nmf.authority, nmf.tentative_design,
    mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
    mid.title, ah.first_name, ah.profile_picture,
    nmfd.completed_by, nmfd.assign_on, nmfd.days,
    latest.latest_status, latest.latest_status_at
`;

const formatStageResult = (result, stageTitle, statusKey, titleOrder) =>
  result.map((row) => ({
    ...row,
    member_names: [
      {
        member_names: row.member_names,
        hod: row.hod_name,
        title: row.title || stageTitle,
        days: row.remaining_days,
        todo_status: row.latest_status || null,
        todo_date: row.latest_status_at || null,
      },
    ].sort(
      (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
    ),
  }));

// ─── Add at top of controller file ──────────────────────────────────────────
const empArchCache = {
  TTL: 60 * 1000,
  isFetching: {},
  store: {}, // keyed by `${userId}_${tabKey}`
};

const getEmpCached = async (userId, tabKey, fetchFn) => {
  const key = `${userId}_${tabKey}`;
  const now = Date.now();
  const entry = empArchCache.store[key];

  if (entry && now - entry.lastFetched < empArchCache.TTL) {
    return entry.data;
  }

  if (empArchCache.isFetching[key]) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!empArchCache.isFetching[key]) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    return empArchCache.store[key]?.data;
  }

  empArchCache.isFetching[key] = true;
  try {
    const data = await fetchFn();
    empArchCache.store[key] = { data, lastFetched: Date.now() };
    empArchCache.isFetching[key] = false;
    return data;
  } catch (e) {
    empArchCache.isFetching[key] = false;
    throw e;
  }
};

// ─── Shared employee stage query builder ────────────────────────────────────
const buildEmpStageQuery = (stageJoin, statusCol, projectNameId) => `
  SELECT 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
    nmf.b_no, nmf.rs_no, nmf.address, nmf.authority, nmf.tentative_design,
    nmf.google_location,
    mc.name AS projectType, mpt.title AS category, v.name AS village,
    u.first_name AS client_name, tp.tpscheme,
    mid.title AS landtype,
    ah.first_name AS hod_name, ah.profile_picture AS hod_profile,
    GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
    GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
    GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
    ${statusCol},
    nmfd.completed_by, nmfd.assign_on, nmfd.days,
    CASE 
      WHEN CURDATE() < nmfd.assign_on THEN NULL
      WHEN latest.latest_status_at IS NOT NULL 
        THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
      ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status, latest.latest_status_at
  FROM new_mst_file AS nmf
  LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  LEFT JOIN village AS v ON v.id = nmf.village
  LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  LEFT JOIN users AS u ON u.id = nmf.client_id
  LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  LEFT JOIN users AS au 
    ON nmfd.assign_members IS NOT NULL
    AND JSON_VALID(nmfd.assign_members)
    AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
  ${stageJoin}
  LEFT JOIN (
    SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
    FROM todos t1
    INNER JOIN (
      SELECT file_id, MAX(status_at) AS max_status_at FROM todos GROUP BY file_id
    ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  ) latest ON latest.file_id = nmfd.id
  WHERE nmfpd.is_deleted = 0
    AND nmfpd.application_name = 'architecture_design'
    AND nmfd.project_name = ${projectNameId}
    AND nmfd.is_deleted = 0
    AND (
      FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      OR nmfd.assign_to_hod = ?
    )
  GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
    nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
    nmf.authority, nmf.tentative_design,
    mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
    mid.title, ah.first_name, ah.profile_picture,
    nmfd.completed_by, nmfd.assign_on, nmfd.days,
    latest.latest_status, latest.latest_status_at
`;

const formatEmpStageResult = (result, stageTitle, titleOrder) =>
  result.map((row) => ({
    ...row,
    member_names: [
      {
        member_names: row.member_names,
        title: row.title || stageTitle,
        hod: row.hod_name,
        days: row.remaining_days,
        todo_status: row.latest_status || null,
        todo_date: row.latest_status_at || null,
      },
    ].sort(
      (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
    ),
  }));
module.exports = {
  // ─── getAllArchitecture (N+1 fix: batch HOD query) ───────────────────────────
  getAllArchitecture: async (req, res) => {
    try {
      const data = await getCached("all", async () => {
        const sql = `
        SELECT 
          nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
          nmf.b_no, nmf.rs_no, nmf.address, nmf.google_location,
          nmf.authority, nmf.tentative_design,
          mc.name AS projectType, mpt.title AS category, v.name AS village,
          pv.pv_file, u.first_name AS client_name,
          fn.fire_noc_receipt, od.approval_plan, tp.tpscheme,
          GROUP_CONCAT(DISTINCT mad.title SEPARATOR ', ') AS title,
          GROUP_CONCAT(DISTINCT CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS basic_details_status,
          GROUP_CONCAT(DISTINCT CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS space_planning_status,
          GROUP_CONCAT(DISTINCT CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS quoation_status,
          GROUP_CONCAT(DISTINCT CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS dc_status,
          GROUP_CONCAT(DISTINCT CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS consultant_status,
          GROUP_CONCAT(DISTINCT CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS drawing_status,
          GROUP_CONCAT(DISTINCT CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS schedule_status,
          GROUP_CONCAT(DISTINCT CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS risk_status
        FROM new_mst_file AS nmf
        LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
        LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
        LEFT JOIN village AS v ON v.id = nmf.village
        LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
        LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
        LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
        LEFT JOIN users AS u ON u.id = nmf.client_id
        LEFT JOIN pv ON pv.approval_id = nmf.id
        LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
        LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
        LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
        LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
        LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
        LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
        LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
        LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
        LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
        LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
        WHERE nmfpd.is_deleted = 0
          AND nmfpd.application_name = 'architecture_design'
          AND nmfd.is_deleted = 0
        GROUP BY 
          nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
          nmf.b_no, nmf.rs_no, nmf.authority, nmf.tentative_design,
          nmf.address, mc.name, mpt.title, nmf.google_location, v.name,
          pv.pv_file, u.first_name, fn.fire_noc_receipt, od.approval_plan, tp.tpscheme
      `;

        const results = await queryAsync(sql);
        if (!results.length) return [];

        // ✅ ONE batch query instead of one query per row (N+1 fix)
        const projectIds = results.map((r) => r.id);
        const hodSql = `
        SELECT 
          nmfd.project_id,
          mad.title AS stage_title,
          u.first_name AS hod_name,
          u.profile_picture AS hod_profile,
          GROUP_CONCAT(au.first_name SEPARATOR ', ') AS member_names,
          GROUP_CONCAT(au.profile_picture SEPARATOR ', ') AS assign_profile,
          nmfd.completed_by,
          CASE 
            WHEN ANY_VALUE(lt.status_at) IS NOT NULL 
              THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
            ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
          END AS remaining_days,
          ANY_VALUE(lt.status) AS latest_status,
          ANY_VALUE(lt.status_at) AS latest_status_at
        FROM new_mst_file_details AS nmfd
        LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
        LEFT JOIN users AS u ON u.id = nmfd.assign_to_hod
        LEFT JOIN users AS au 
          ON nmfd.assign_members IS NOT NULL 
          AND JSON_VALID(nmfd.assign_members)
          AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
        LEFT JOIN (
          SELECT t1.*
          FROM todos t1
          INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos GROUP BY file_id
          ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
        ) AS lt ON lt.file_id = nmfd.id
        WHERE nmfd.project_id IN (?)
          AND nmfd.source_type = 2
          AND nmfd.is_deleted = 0
        GROUP BY nmfd.project_id, nmfd.id, mad.title, u.first_name, u.profile_picture, nmfd.completed_by
      `;

        const hodRows = await queryAsync(hodSql, [projectIds]);

        // Group hod rows by project_id
        const hodByProject = {};
        hodRows.forEach((hr) => {
          if (!hodByProject[hr.project_id]) hodByProject[hr.project_id] = [];
          hodByProject[hr.project_id].push(hr);
        });

        const STAGE_STATUS_MAP = [
          { title: "Basic Details", statusKey: "basic_details_status" },
          { title: "Study/RND", statusKey: "study_rnd_status" },
          { title: "Quotation", statusKey: "quoation_status" },
          { title: "Design Concept", statusKey: "dc_status" },
          { title: "Consultants", statusKey: "consultant_status" },
          { title: "Technical Drawings", statusKey: "drawing_status" },
          { title: "Schedule", statusKey: "schedule_status" },
          { title: "Risk Matrix", statusKey: "risk_status" },
        ];

        const titleOrder = {
          "Basic Details": 1,
          "Study/RND": 2,
          Quotation: 3,
          "Design Concept": 4,
          Consultants: 5,
          "Technical Drawings": 6,
          Schedule: 7,
          "Risk Matrix": 8,
        };

        return results.map((row) => {
          const projectHodRows = hodByProject[row.id] || [];

          if (projectHodRows.length > 0) {
            row.hod_name = projectHodRows[0].hod_name;
            row.hod_profile = projectHodRows[0].hod_profile;
            row.assign_profile = projectHodRows[0].assign_profile;

            const stageMap = new Map();
            projectHodRows.forEach((hr) => {
              if (hr.stage_title) stageMap.set(hr.stage_title.trim(), hr);
            });

            row.member_names = STAGE_STATUS_MAP.map((stage) => {
              const hr = stageMap.get(stage.title);
              return {
                title: stage.title,
                member_names: hr ? hr.member_names || null : null,
                hod: hr ? hr.hod_name || null : null,
                days: hr ? (hr.remaining_days ?? null) : null,
                todo_status: hr ? hr.latest_status || null : null,
                todo_date: hr ? hr.latest_status_at || null : null,
              };
            }).sort(
              (a, b) =>
                (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
            );
          } else {
            row.hod_name = null;
            row.hod_profile = null;
            row.assign_profile = null;
            row.member_names = STAGE_STATUS_MAP.map((stage) => ({
              title: stage.title,
              member_names: null,
              hod: null,
              days: null,
              todo_status: null,
              todo_date: null,
            }));
          }
          return row;
        });
      });

      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      console.error(e);
      return res
        .status(500)
        .json({
          error: true,
          message: "Error fetching architecture data",
          data: {},
        });
    }
  },

  // ─── Stage tab handlers (all use shared builder + cache) ────────────────────
  getBasicArch: async (req, res) => {
    try {
      const data = await getCached("basic", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS basic_details_status`,
          1,
        );
        const result = await queryAsync(sql);
        return formatStageResult(
          result,
          "Basic Details",
          "basic_details_status",
          { "Basic Details": 1 },
        );
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getStudyArch: async (req, res) => {
    try {
      const data = await getCached("study", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS space_planning_status`,
          2,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Study/RND", "space_planning_status", {
          "Study/RND": 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getQuotationArch: async (req, res) => {
    try {
      const data = await getCached("quotation", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS quoation_status`,
          3,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Quotation", "quoation_status", {
          Quotation: 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getdesignconceptArch: async (req, res) => {
    try {
      const data = await getCached("designconcept", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS dc_status`,
          4,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Design Concept", "dc_status", {
          "Design Concept": 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getConsultantsArch: async (req, res) => {
    try {
      const data = await getCached("consultants", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS consultant_status`,
          5,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Consultants", "consultant_status", {
          Consultants: 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getTechnicalDrawingsArch: async (req, res) => {
    try {
      const data = await getCached("drawings", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS drawing_status`,
          6,
        );
        const result = await queryAsync(sql);
        return formatStageResult(
          result,
          "Technical Drawings",
          "drawing_status",
          { "Technical Drawings": 1 },
        );
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getScheduleArch: async (req, res) => {
    try {
      const data = await getCached("schedule", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1`,
          `GROUP_CONCAT(DISTINCT CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS schedule_status`,
          7,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Schedule", "schedule_status", {
          Schedule: 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  getRiskArch: async (req, res) => {
    try {
      const data = await getCached("risk", async () => {
        const sql = buildStageQuery(
          `LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS risk_status`,
          8,
        );
        const result = await queryAsync(sql);
        return formatStageResult(result, "Risk Matrix", "risk_status", {
          "Risk Matrix": 1,
        });
      });
      return res
        .status(201)
        .json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e.message, data: {} });
    }
  },

  //   getAllArchitecture: (req, res) => {
  //     var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.google_location,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       pv.pv_file,
  //       u.first_name AS client_name,
  //       fn.fire_noc_receipt,
  //       od.approval_plan,
  //       tp.tpscheme,
  //       GROUP_CONCAT(DISTINCT mad.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS basic_details_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS space_planning_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS quoation_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS dc_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS consultant_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS drawing_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS schedule_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS risk_status
  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN pv ON pv.approval_id = nmf.id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
  //     LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
  //     LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
  //     LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
  //     LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
  //     LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
  //     LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
  //     LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.is_deleted = 0
  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
  //       nmf.b_no, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       nmf.address, mc.name, mpt.title, nmf.google_location, v.name,
  //       pv.pv_file, u.first_name, fn.fire_noc_receipt, od.approval_plan, tp.tpscheme
  //   `;

  //     // Title order for arch stages — same pattern as getAllFile's titleOrder
  //     const titleOrder = {
  //       "Basic Details": 1,
  //       "Study/RND": 2,
  //       Quotation: 3,
  //       "Design Concept": 4,
  //       Consultants: 5,
  //       "Technical Drawings": 6,
  //       Schedule: 7,
  //       "Risk Matrix": 8,
  //     };

  //     // Maps each arch stage title to its status key on the row
  //     const STAGE_STATUS_MAP = [
  //       { title: "Basic Details", statusKey: "basic_details_status" },
  //       { title: "Study/RND", statusKey: "study_rnd_status" },
  //       { title: "Quotation", statusKey: "quoation_status" },
  //       { title: "Design Concept", statusKey: "dc_status" },
  //       { title: "Consultants", statusKey: "consultant_status" },
  //       { title: "Technical Drawings", statusKey: "drawing_status" },
  //       { title: "Schedule", statusKey: "schedule_status" },
  //       { title: "Risk Matrix", statusKey: "risk_status" },
  //     ];

  //     db.query(sql, async function (err, results) {
  //       if (err) {
  //         return res
  //           .status(201)
  //           .json({ error: true, message: err.sqlMessage, data: {} });
  //       }

  //       if (results.length === 0) {
  //         return res.status(201).json({
  //           error: true,
  //           message: "Requesting record not found",
  //           data: {},
  //         });
  //       }

  //       try {
  //         const enrichedResults = await Promise.all(
  //           results.map((row) => {
  //             return new Promise((resolve, reject) => {
  //               // Per-stage HOD + member query — one row per nmfd stage entry
  //               const hodSql = `
  //               SELECT
  //                 mad.title                                          AS stage_title,
  //                 u.first_name                                       AS hod_name,
  //                 u.profile_picture                                  AS hod_profile,
  //                 GROUP_CONCAT(au.first_name    SEPARATOR ', ')      AS member_names,
  //                 GROUP_CONCAT(au.profile_picture SEPARATOR ', ')    AS assign_profile,
  //                 nmfd.completed_by,
  //                 CASE
  //                   WHEN ANY_VALUE(lt.status_at) IS NOT NULL
  //                   THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
  //                   ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //                 END AS remaining_days,
  //                 ANY_VALUE(lt.status)    AS latest_status,
  //                 ANY_VALUE(lt.status_at) AS latest_status_at
  //               FROM new_mst_file_details AS nmfd
  //               LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
  //               LEFT JOIN users AS u ON u.id = nmfd.assign_to_hod
  //               LEFT JOIN users AS au
  //                 ON nmfd.assign_members IS NOT NULL
  //                 AND JSON_VALID(nmfd.assign_members)
  //                 AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //               LEFT JOIN (
  //                 SELECT t1.*
  //                 FROM todos t1
  //                 INNER JOIN (
  //                   SELECT file_id, MAX(status_at) AS max_status_at
  //                   FROM todos
  //                   GROUP BY file_id
  //                 ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //               ) AS lt ON lt.file_id = nmfd.id
  //               WHERE nmfd.project_id = ?
  //                 AND nmfd.source_type = 2
  //                 AND nmfd.is_deleted = 0
  //               GROUP BY nmfd.id, mad.title, u.first_name, u.profile_picture, nmfd.completed_by
  //             `;

  //               db.query(hodSql, [row.id], (hodErr, hodRows) => {
  //                 if (hodErr) return reject(hodErr);

  //                 if (hodRows.length > 0) {
  //                   // Top-level HOD + profile from first row (overall lead)
  //                   row.hod_name = hodRows[0].hod_name;
  //                   row.hod_profile = hodRows[0].hod_profile;
  //                   row.assign_profile = hodRows[0].assign_profile;

  //                   // Build member_names array — same shape as getAllFile
  //                   // One entry per arch stage (from STAGE_STATUS_MAP),
  //                   // merged with per-stage HOD/member data from hodRows
  //                   const stageMap = new Map();
  //                   hodRows.forEach((hr) => {
  //                     if (hr.stage_title) {
  //                       stageMap.set(hr.stage_title.trim(), hr);
  //                     }
  //                   });

  //                   row.member_names = STAGE_STATUS_MAP.map((stage) => {
  //                     const hr = stageMap.get(stage.title);
  //                     return {
  //                       title: stage.title,
  //                       member_names: hr ? hr.member_names || null : null,
  //                       hod: hr ? hr.hod_name || null : null,
  //                       days: hr ? (hr.remaining_days ?? null) : null,
  //                       todo_status: hr ? hr.latest_status || null : null,
  //                       todo_date: hr ? hr.latest_status_at || null : null,
  //                     };
  //                   });

  //                   // Sort by titleOrder — same pattern as getAllFile
  //                   row.member_names.sort(
  //                     (a, b) =>
  //                       (titleOrder[a.title] || 999) -
  //                       (titleOrder[b.title] || 999),
  //                   );
  //                 } else {
  //                   row.hod_name = null;
  //                   row.hod_profile = null;
  //                   row.assign_profile = null;

  //                   // Still return the full stage list with nulls so the frontend
  //                   // always gets a consistent array shape
  //                   row.member_names = STAGE_STATUS_MAP.map((stage) => ({
  //                     title: stage.title,
  //                     member_names: null,
  //                     hod: null,
  //                     days: null,
  //                     todo_status: null,
  //                     todo_date: null,
  //                   }));
  //                 }

  //                 resolve(row);
  //               });
  //             });
  //           }),
  //         );

  //         res.status(201).json({
  //           error: false,
  //           message: "Record fetched",
  //           data: enrichedResults,
  //         });
  //       } catch (e) {
  //         res.status(201).json({
  //           error: true,
  //           message: "Error fetching HOD/assign_member data",
  //           data: {},
  //         });
  //       }
  //     });
  //   },
  //   getBasicArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.google_location,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS basic_details_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       -- Remaining days — same logic as getDCFile
  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd
  //       ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     -- Latest todo per nmfd row — same subquery as getDCFile
  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 1
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   // Title order for Basic Details tab — matches getDCFile pattern
  //   const titleOrder = {
  //     "Basic Details": 1,
  //   };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     // Format member_names as array of objects — same shape as getDCFile
  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Basic Details",
  //             hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // getStudyArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.address,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       nmf.google_location,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS space_planning_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 2
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Study/RND": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Study/RND",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getQuotationArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.google_location,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS quoation_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 3
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Quotation": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Quotation",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getdesignconceptArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.address,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.google_location,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS dc_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 4
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Design Concept": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Design Concept",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getConsultantsArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.address,
  //       nmf.google_location,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS consultant_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 5
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Consultants": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Consultants",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // getTechnicalDrawingsArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.google_location,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS drawing_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 6
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Technical Drawings": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Technical Drawings",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getScheduleArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.google_location,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       ah.first_name AS hod_name,
  //       mid.title AS landtype,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS schedule_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 7
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Schedule": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Schedule",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getRiskArch: (req, res) => {
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       nmf.google_location,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       ah.first_name AS hod_name,
  //       mid.title AS landtype,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS risk_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.source_type = 2
  //       AND nmfd.project_name = 8
  //       AND nmfd.is_deleted = 0

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.address,
  //       nmf.op_no, nmf.b_no, nmf.rs_no, nmf.google_location,
  //       nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = { "Risk Matrix": 1 };

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           hod:          row.hod_name,
  //           title:        row.title || "Risk Matrix",
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // ─── getempArch (with N+1 batch fix) ────────────────────────────────────────
  getempArch: async (req, res) => {
    const userId = req.user.id;
    console.time(`getempArch_${userId}`);
    try {
      const data = await getEmpCached(userId, "all", async () => {
        console.time(`step1_assign_${userId}`);
        const assignSql = `
  SELECT DISTINCT nmfd.project_id
  FROM new_mst_file_details AS nmfd
  INNER JOIN new_mst_file_project_details AS nmfpd 
    ON nmfpd.project_id = nmfd.project_id
  WHERE nmfpd.is_deleted = 0
    AND nmfpd.application_name = 'architecture_design'
    AND nmfd.is_deleted = 0
    AND (
      nmfd.assign_to_hod = ?
      OR nmfd.assign_members LIKE CONCAT('%', ?, '%')
    )
`;
        const assignedRows = await queryAsync(assignSql, [userId, userId]);
        console.timeEnd(`step1_assign_${userId}`);
        console.log(`Found ${assignedRows.length} projects for user ${userId}`);

        if (!assignedRows.length) return [];
        const projectIds = assignedRows.map((r) => r.project_id);

        console.time(`step2_files_${userId}`);
        const sql = `
  SELECT DISTINCT
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
    nmf.b_no, nmf.address, nmf.rs_no, nmf.authority, nmf.tentative_design,
    mc.name AS projectType, nmf.google_location,
    mpt.title AS category, v.name AS village,
    u.first_name AS client_name, tp.tpscheme,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM arch_basic_details WHERE arch_id = nmf.id LIMIT 1) AS basic_details_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM arch_space_planning WHERE arch_id = nmf.id LIMIT 1) AS space_planning_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM mst_arch_fees WHERE arch_id = nmf.id LIMIT 1) AS quoation_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM arch_finald WHERE arch_id = nmf.id LIMIT 1) AS dc_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM arch_threed WHERE arch_id = nmf.id LIMIT 1) AS consultant_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM arch_drawing WHERE arch_id = nmf.id LIMIT 1) AS drawing_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM schedule WHERE source_id = nmf.id AND source_type = 1 LIMIT 1) AS schedule_status,

    (SELECT CASE WHEN is_done = 1 THEN 'green' ELSE 'yellow' END 
     FROM mst_arch_risk_matrix WHERE arch_id = nmf.id LIMIT 1) AS risk_status

  FROM new_mst_file AS nmf
  LEFT JOIN mst_category AS mc        ON mc.id  = nmf.project_type
  LEFT JOIN mst_project_type AS mpt   ON mpt.id = nmf.category
  LEFT JOIN village AS v              ON v.id   = nmf.village
  LEFT JOIN tpscheme AS tp            ON tp.id  = nmf.tpscheme
  LEFT JOIN users AS u                ON u.id   = nmf.client_id
  WHERE nmf.id IN (?) and nmf.is_deleted = 0
`;
        const results = await queryAsync(sql, [projectIds]);
        console.timeEnd(`step2_files_${userId}`);
        console.log(`Got ${results.length} file rows`);

        if (!results.length) return [];

        console.time(`step3_hod_${userId}`);
        const hodSql = `
        SELECT 
          nmfd.project_id,
          mad.title        AS stage_title,
          u.first_name     AS hod_name,
          u.profile_picture AS hod_profile,
          GROUP_CONCAT(DISTINCT au.first_name     SEPARATOR ', ') AS member_names,
          GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
          nmfd.completed_by,
          DATEDIFF(nmfd.completed_by, CURDATE()) AS remaining_days
        FROM new_mst_file_details AS nmfd
        LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
        LEFT JOIN users AS u              ON u.id   = nmfd.assign_to_hod
        LEFT JOIN users AS au 
          ON nmfd.assign_members IS NOT NULL
          AND nmfd.assign_members LIKE CONCAT('%', au.id, '%')
        WHERE nmfd.project_id IN (?)
          AND nmfd.source_type = 2
          AND nmfd.is_deleted  = 0
        GROUP BY nmfd.project_id, nmfd.id, mad.title,
                 u.first_name, u.profile_picture, nmfd.completed_by
      `;
        const hodRows = await queryAsync(hodSql, [projectIds]);
        console.timeEnd(`step3_hod_${userId}`);
        console.log(`Got ${hodRows.length} HOD rows`);

        const seen = new Set();
        const uniqueResults = results.filter((row) => {
          if (seen.has(row.id)) return false;
          seen.add(row.id);
          return true;
        });

        console.log(`After dedup: ${uniqueResults.length} unique projects`);

        // mapping (same as before)
        const hodByProject = {};
        hodRows.forEach((hr) => {
          if (!hodByProject[hr.project_id]) hodByProject[hr.project_id] = [];
          hodByProject[hr.project_id].push(hr);
        });

        const STAGE_STATUS_MAP = [
          { title: "Basic Details" },
          { title: "Study/RND" },
          { title: "Quotation" },
          { title: "Design Concept" },
          { title: "Consultants" },
          { title: "Technical Drawings" },
          { title: "Schedule" },
          { title: "Risk Matrix" },
        ];
        const titleOrder = {
          "Basic Details": 1,
          "Study/RND": 2,
          Quotation: 3,
          "Design Concept": 4,
          Consultants: 5,
          "Technical Drawings": 6,
          Schedule: 7,
          "Risk Matrix": 8,
        };

        return results.map((row) => {
          const projectHodRows = hodByProject[row.id] || [];
          const stageMap = new Map();
          projectHodRows.forEach((hr) => {
            if (hr.stage_title) stageMap.set(hr.stage_title.trim(), hr);
          });
          row.hod_name = projectHodRows[0]?.hod_name || null;
          row.hod_profile = projectHodRows[0]?.hod_profile || null;
          row.assign_profile = projectHodRows[0]?.assign_profile || null;
          row.member_names = STAGE_STATUS_MAP.map((stage) => {
            const hr = stageMap.get(stage.title);
            return {
              title: stage.title,
              member_names: hr?.member_names || null,
              hod: hr?.hod_name || null,
              days: hr?.remaining_days ?? null,
              todo_status: null,
              todo_date: null,
            };
          }).sort(
            (a, b) =>
              (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
          );
          return row;
        });
      });

      console.timeEnd(`getempArch_${userId}`);
      res.status(200).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({ error: true, message: "Error fetching data", data: {} });
    }
  },

  // ─── All 8 stage tabs — now using shared builder + cache ────────────────────
  getempBasicArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "basic", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS basic_details_status`,
          1,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Basic Details", {
          "Basic Details": 1,
        });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempStudyArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "study", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS space_planning_status`,
          2,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Study/RND", { "Study/RND": 1 });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempQuotationArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "quotation", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS quoation_status`,
          3,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Quotation", { Quotation: 1 });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempdesignconceptArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "designconcept", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS dc_status`,
          4,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Design Concept", {
          "Design Concept": 1,
        });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempConsultantsArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "consultants", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS consultant_status`,
          5,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Consultants", { Consultants: 1 });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempTdArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "technical", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS drawing_status`,
          6,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Technical Drawings", {
          "Technical Drawings": 1,
        });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempScheduleArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "schedule", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1`,
          `GROUP_CONCAT(DISTINCT CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS schedule_status`,
          7,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Schedule", { Schedule: 1 });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  getempRiskArch: async (req, res) => {
    const userId = req.user.id;
    try {
      const data = await getEmpCached(userId, "risk", async () => {
        const sql = buildEmpStageQuery(
          `LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id`,
          `GROUP_CONCAT(DISTINCT CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END SEPARATOR ',') AS risk_status`,
          8,
        );
        const result = await queryAsync(sql, [userId, userId]);
        return formatEmpStageResult(result, "Risk Matrix", {
          "Risk Matrix": 1,
        });
      });
      res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      res.status(500).json({ error: true, message: e.message, data: {} });
    }
  },

  // getempArch: (req, res) => {
  //   const userId = req.user.id;

  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.address,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       nmf.google_location,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       GROUP_CONCAT(DISTINCT mad.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS basic_details_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS space_planning_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS quoation_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS dc_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS consultant_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS drawing_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS schedule_status,
  //       GROUP_CONCAT(DISTINCT
  //         CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END
  //         SEPARATOR ','
  //       ) AS risk_status,
  //       hu.first_name AS hod_name,
  //       hu.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name SEPARATOR ', ') AS member_names
  //     FROM
  //       new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
  //     LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
  //     LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
  //     LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
  //     LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
  //     LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
  //     LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
  //     LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
  //     LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )
  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no,
  //       nmf.b_no, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       nmf.address, mc.name, mpt.title, v.name, u.first_name,
  //       tp.tpscheme, nmf.google_location,
  //       hu.first_name, hu.profile_picture
  //   `;

  //   // ── Same titleOrder + STAGE_STATUS_MAP as getAllArchitecture ──────────────
  //   const titleOrder = {
  //     "Basic Details":      1,
  //     "Study/RND":          2,
  //     "Quotation":          3,
  //     "Design Concept":     4,
  //     "Consultants":        5,
  //     "Technical Drawings": 6,
  //     "Schedule":           7,
  //     "Risk Matrix":        8,
  //   };

  //   const STAGE_STATUS_MAP = [
  //     { title: "Basic Details",      statusKey: "basic_details_status" },
  //     { title: "Study/RND",          statusKey: "study_rnd_status" },
  //     { title: "Quotation",          statusKey: "quoation_status" },
  //     { title: "Design Concept",     statusKey: "dc_status" },
  //     { title: "Consultants",        statusKey: "consultant_status" },
  //     { title: "Technical Drawings", statusKey: "drawing_status" },
  //     { title: "Schedule",           statusKey: "schedule_status" },
  //     { title: "Risk Matrix",        statusKey: "risk_status" },
  //   ];

  //   db.query(sql, [userId, userId], async function (err, results) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (results.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     try {
  //       const enrichedResults = await Promise.all(
  //         results.map((row) => {
  //           return new Promise((resolve, reject) => {
  //             // ── Per-stage HOD + member query (identical to getAllArchitecture) ──
  //             const hodSql = `
  //               SELECT
  //                 mad.title                                         AS stage_title,
  //                 u.first_name                                      AS hod_name,
  //                 u.profile_picture                                 AS hod_profile,
  //                 GROUP_CONCAT(au.first_name    SEPARATOR ', ')     AS member_names,
  //                 GROUP_CONCAT(au.profile_picture SEPARATOR ', ')   AS assign_profile,
  //                 nmfd.completed_by,
  //                 CASE
  //                   WHEN ANY_VALUE(lt.status_at) IS NOT NULL
  //                   THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
  //                   ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //                 END AS remaining_days,
  //                 ANY_VALUE(lt.status)    AS latest_status,
  //                 ANY_VALUE(lt.status_at) AS latest_status_at
  //               FROM new_mst_file_details AS nmfd
  //               LEFT JOIN mst_arch_details AS mad ON mad.id = nmfd.project_name
  //               LEFT JOIN users AS u ON u.id = nmfd.assign_to_hod
  //               LEFT JOIN users AS au
  //                 ON nmfd.assign_members IS NOT NULL
  //                 AND JSON_VALID(nmfd.assign_members)
  //                 AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //               LEFT JOIN (
  //                 SELECT t1.*
  //                 FROM todos t1
  //                 INNER JOIN (
  //                   SELECT file_id, MAX(status_at) AS max_status_at
  //                   FROM todos
  //                   GROUP BY file_id
  //                 ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //               ) AS lt ON lt.file_id = nmfd.id
  //               WHERE nmfd.project_id = ?
  //                 AND nmfd.source_type = 2
  //                 AND nmfd.is_deleted = 0
  //               GROUP BY nmfd.id, mad.title, u.first_name, u.profile_picture, nmfd.completed_by
  //             `;

  //             db.query(hodSql, [row.id], (hodErr, hodRows) => {
  //               if (hodErr) return reject(hodErr);

  //               if (hodRows.length > 0) {
  //                 // Top-level HOD from first row (overall lead)
  //                 row.hod_name     = hodRows[0].hod_name;
  //                 row.hod_profile  = hodRows[0].hod_profile;
  //                 row.assign_profile = hodRows[0].assign_profile;

  //                 // Build per-stage member_names array — same shape as getAllArchitecture
  //                 const stageMap = new Map();
  //                 hodRows.forEach((hr) => {
  //                   if (hr.stage_title) stageMap.set(hr.stage_title.trim(), hr);
  //                 });

  //                 row.member_names = STAGE_STATUS_MAP.map((stage) => {
  //                   const hr = stageMap.get(stage.title);
  //                   return {
  //                     title:       stage.title,
  //                     member_names: hr ? hr.member_names  || null : null,
  //                     hod:          hr ? hr.hod_name      || null : null,
  //                     days:         hr ? (hr.remaining_days ?? null) : null,
  //                     todo_status:  hr ? hr.latest_status  || null : null,
  //                     todo_date:    hr ? hr.latest_status_at || null : null,
  //                   };
  //                 });

  //                 // Sort by titleOrder
  //                 row.member_names.sort(
  //                   (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
  //                 );
  //               } else {
  //                 row.hod_name     = null;
  //                 row.hod_profile  = null;
  //                 row.assign_profile = null;

  //                 // Return consistent array shape with nulls for every stage
  //                 row.member_names = STAGE_STATUS_MAP.map((stage) => ({
  //                   title:        stage.title,
  //                   member_names: null,
  //                   hod:          null,
  //                   days:         null,
  //                   todo_status:  null,
  //                   todo_date:    null,
  //                 }));
  //               }

  //               resolve(row);
  //             });
  //           });
  //         }),
  //       );

  //       res.status(201).json({
  //         error: false,
  //         message: "Record fetched",
  //         data: enrichedResults,
  //       });
  //     } catch (e) {
  //       res.status(201).json({
  //         error: true,
  //         message: "Error fetching HOD/assign_member data",
  //         data: {},
  //       });
  //     }
  //   });
  // },

  // getempBasicArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.address,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       nmf.google_location,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN abd.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS basic_details_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       -- Remaining days — same logic as getBasicArch
  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN arch_basic_details AS abd ON abd.arch_id = nmf.id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     -- Latest todo per nmfd row — same subquery as getBasicArch
  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 1
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.google_location,
  //       nmf.fp_no, nmf.op_no, nmf.b_no, nmf.address,
  //       nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   // Title order for Basic Details tab — matches getBasicArch pattern
  //   const titleOrder = {
  //     "Basic Details": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     // Format member_names as array of objects — same shape as getBasicArch
  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Basic Details",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // getempStudyArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.google_location,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN asp.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS space_planning_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       -- Remaining days
  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN arch_space_planning AS asp ON asp.arch_id = nmf.id
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     -- Latest todo per nmfd row
  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 2
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.rs_no, nmf.google_location, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   // Title order for Study Arch tab
  //   const titleOrder = {
  //     "Space Planning": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     // Format member_names as array of objects — same shape as getempBasicArch
  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Space Planning",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getempQuotationArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.address,
  //       nmf.google_location,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN am.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS quoation_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN mst_arch_fees AS am ON am.arch_id = nmf.id
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 3
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Quotation": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Quotation",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getempdesignconceptArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.address,
  //       nmf.google_location,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN af.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS dc_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN arch_finald AS af ON af.arch_id = nmf.id
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 4
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Design Concept": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Design Concept",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // getempConsultantsArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       nmf.google_location,
  //       nmf.address,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN atd.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS consultant_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN arch_threed AS atd ON atd.arch_id = nmf.id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 5
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Consultants": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Consultants",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getempTdArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       nmf.google_location,
  //       nmf.address,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN ad.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS drawing_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN arch_drawing AS ad ON ad.arch_id = nmf.id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 6
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Technical Drawing": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Technical Drawing",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },

  // getempScheduleArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.address,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       nmf.google_location,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN s.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS schedule_status,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 1
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 7
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Schedule": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Schedule",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  // getempRiskArch: (req, res) => {
  //   const userId = req.user.id;
  //   var sql = `
  //     SELECT
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.address,
  //       nmf.authority,
  //       nmf.tentative_design,
  //       nmf.google_location,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       u.first_name AS client_name,
  //       tp.tpscheme,
  //       mid.title AS landtype,
  //       ah.first_name AS hod_name,
  //       ah.profile_picture AS hod_profile,
  //       GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
  //       GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
  //       GROUP_CONCAT(DISTINCT
  //         CASE
  //           WHEN marm.is_done = 1 THEN 'green'
  //           ELSE 'yellow'
  //         END
  //         SEPARATOR ','
  //       ) AS risk_status,
  //       GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,

  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //       nmfd.days,

  //       CASE
  //         WHEN CURDATE() < nmfd.assign_on THEN NULL
  //         WHEN latest.latest_status_at IS NOT NULL
  //           THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //         ELSE DATEDIFF(nmfd.completed_by, CURDATE())
  //       END AS remaining_days,

  //       latest.latest_status,
  //       latest.latest_status_at

  //     FROM new_mst_file AS nmf
  //     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //     LEFT JOIN village AS v ON v.id = nmf.village
  //     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN users AS u ON u.id = nmf.client_id
  //     LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
  //     LEFT JOIN mst_arch_risk_matrix AS marm ON marm.arch_id = nmf.id
  //     LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
  //     LEFT JOIN users AS au
  //       ON nmfd.assign_members IS NOT NULL
  //       AND JSON_VALID(nmfd.assign_members)
  //       AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
  //     LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name

  //     LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //         SELECT file_id, MAX(status_at) AS max_status_at
  //         FROM todos
  //         GROUP BY file_id
  //       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //     ) latest ON latest.file_id = nmfd.id

  //     WHERE
  //       nmfpd.is_deleted = 0
  //       AND nmfpd.application_name = 'architecture_design'
  //       AND nmfd.project_name = 8
  //       AND nmfd.is_deleted = 0
  //       AND (
  //         FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //         OR nmfd.assign_to_hod = ?
  //       )

  //     GROUP BY
  //       nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no,
  //       nmf.address, nmf.google_location, nmf.rs_no, nmf.authority, nmf.tentative_design,
  //       mc.name, mpt.title, v.name, u.first_name, tp.tpscheme,
  //       mid.title, ah.first_name, ah.profile_picture,
  //       nmfd.completed_by, nmfd.assign_on, nmfd.days,
  //       latest.latest_status, latest.latest_status_at
  //   `;

  //   const titleOrder = {
  //     "Risk Matrix": 1,
  //   };

  //   db.query(sql, [userId, userId], function (err, result) {
  //     if (err) {
  //       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res.status(201).json({
  //         error: true,
  //         message: "Requesting record not found",
  //         data: {},
  //       });
  //     }

  //     const formattedResult = result.map((row) => ({
  //       ...row,
  //       member_names: [
  //         {
  //           member_names: row.member_names,
  //           title:        row.title || "Risk Matrix",
  //           hod:          row.hod_name,
  //           days:         row.remaining_days,
  //           todo_status:  row.latest_status || null,
  //           todo_date:    row.latest_status_at || null,
  //         },
  //       ].sort(
  //         (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
  //       ),
  //     }));

  //     return res.status(201).json({
  //       error: false,
  //       message: "Record fetched",
  //       data: formattedResult,
  //     });
  //   });
  // },
  deletearchiecture: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (!id) {
        return res.status(200).json({
          error: true,
          message: "Invalid request",
          data: {},
        });
      }

      const data = {
        is_deleted: 1,
        updated_at: getCurrentDateAndTime(),
        updated_by: !isNaN(parseInt(req?.user?.id))
          ? parseInt(req?.user?.id)
          : 0,
      };

      const sql1 = `
        UPDATE new_mst_file_project_details 
        SET ? 
        WHERE application_name = "architecture_design" AND project_id = ?
      `;
      const checksql = `SELECT id FROM new_mst_file_details WHERE project_id = ?`;
      const sql2 = `UPDATE todos SET is_deleted = 1 WHERE file_id = ?`;
      const schedulesql = `SELECT id FROM schedule WHERE source_type = 1 AND source_id = ?`;
      const sql3 = `UPDATE todos SET is_deleted = 1 WHERE schedule_id = ?`;

      // Step 1: update architecture_design project details
      db.query(sql1, [data, id], (err1) => {
        if (err1) {
          console.log("Error in sql1:", err1);
          return res.status(200).json({
            error: true,
            message: err1.sqlMessage,
            data: {},
          });
        }

        // Step 2: Fetch file_ids from new_mst_file_details
        db.query(checksql, [id], (err2, fileResults) => {
          if (err2) {
            console.log("Error in checksql:", err2);
            return res.status(200).json({
              error: true,
              message: err2.sqlMessage,
              data: {},
            });
          }

          const fileIds = fileResults.map((row) => row.id);

          // Step 3: Update todos based on file_ids
          const fileUpdatePromises = fileIds.map((fileId) => {
            return new Promise((resolve, reject) => {
              db.query(sql2, [fileId], (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          });

          // Step 4: Fetch schedule_ids from schedule table
          db.query(schedulesql, [id], (err3, scheduleResults) => {
            if (err3) {
              console.log("Error in schedulesql:", err3);
              return res.status(200).json({
                error: true,
                message: err3.sqlMessage,
                data: {},
              });
            }

            const scheduleIds = scheduleResults.map((row) => row.id);

            // Step 5: Update todos based on schedule_ids
            const scheduleUpdatePromises = scheduleIds.map((scheduleId) => {
              return new Promise((resolve, reject) => {
                db.query(sql3, [scheduleId], (err) => {
                  if (err) return reject(err);
                  resolve();
                });
              });
            });

            // Step 6: Execute all update promises
            Promise.all([...fileUpdatePromises, ...scheduleUpdatePromises])
              .then(() => {
                return res.status(200).json({
                  error: false,
                  message: "Removed!",
                  data: {},
                });
              })
              .catch((err4) => {
                console.log("Error in todos updates:", err4);
                return res.status(200).json({
                  error: true,
                  message: err4.sqlMessage || "Error updating todos",
                  data: {},
                });
              });
          });
        });
      });
    } catch (err) {
      console.log("Catch error:", err);
      return res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  fetcharchbdbyid: (req, res) => {
    const id = req.params.id;
    var sql = `
      select  
      bd.id, bd.project_detail, bd.requirement,bd.scopework,bd.is_done, 
      nmf.id AS nmf_id,
      nmf.company_name,
      nmf.email,
      nmf.phone,
      nmf.authority,
      nmf.google_location,
      nmf.lat,
      nmf.long,
      nmf.land_type,
      nmf.op_no,nmf.ward_no,
      nmf.cs_no,nmf.fp_no,
      nmf.rs_no,
      nmf.address,
      mpt.title as category,
      mc.name as project_type,
      v.name as village,
      tp.tpscheme as tpscheme,
      u.first_name as client_name
      from new_mst_file as nmf
      left join arch_basic_details as bd
      on bd.arch_id = nmf.id
      LEFT JOIN users AS u ON u.id = nmf.client_id
      left join mst_category as mc on mc.id = nmf.project_type
      left join village as v on v.id = nmf.village
      left join tpscheme as tp on tp.id = nmf.tpscheme
      left join mst_project_type as mpt on mpt.id = nmf.category
      WHERE nmf.id= ?;
`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  upsertarchbd: async (req, res) => {
    const user_id = req.user.id;
    const this_data = req.body;

    let parsedQuestions = [];
    if (this_data.questions) {
      if (typeof this_data.questions === "string") {
        try {
          parsedQuestions = JSON.parse(this_data.questions);
        } catch (e) {
          console.error("Failed to parse questions JSON:", e);
          return res.status(400).json({
            error: true,
            message: "Invalid questions format",
            data: {},
          });
        }
      } else if (Array.isArray(this_data.questions)) {
        parsedQuestions = this_data.questions;
      }
    }

    const details = {
      arch_id: this_data.editid,
      client_id: this_data.client_id,
      company_name: this_data.company_name,
      project_type: this_data.project_type,
      scopework: this_data.scopework,
      email: this_data.email,
      phone: this_data.phone,
      project_detail: this_data.project_detail,
      requirement: this_data.requirement,
      updated_at: getCurrentDateAndTime(),
      updated_by: user_id,
      is_deleted: 0,
    };

    if (this_data.editid) {
      const getExistingQuery = `SELECT * FROM arch_basic_details WHERE arch_id = ?`;

      db.query(getExistingQuery, [this_data.editid], function (err, results) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (results.length > 0) {
          const updateQuery = `UPDATE arch_basic_details SET ? WHERE arch_id = ?`;

          db.query(
            updateQuery,
            [details, this_data.editid],
            function (err, result) {
              if (err) {
                return res
                  .status(500)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              }

              if (result.affectedRows === 0) {
                return res.status(400).json({
                  error: true,
                  message: "No record found to update.",
                  data: {},
                });
              }

              parsedQuestions.forEach((question) => {
                const checkQuery = `SELECT * FROM mst_question_answer WHERE source_id = ? AND question_id = ?`;

                db.query(
                  checkQuery,
                  [this_data.editid, question.id],
                  (err, results) => {
                    if (err) {
                      console.error("Error checking question:", err);
                      return;
                    }

                    if (results.length > 0) {
                      const existingAnswer = results[0].answer;

                      const newAnswer =
                        question.answer !== undefined && question.answer !== ""
                          ? question.answer
                          : existingAnswer;

                      const updateQuery = `UPDATE mst_question_answer SET answer = ?, updated_at = ?, updated_by = ? WHERE source_id = ? AND question_id = ?`;
                      db.query(
                        updateQuery,
                        [
                          newAnswer,
                          getCurrentDateAndTime(),
                          user_id,
                          this_data.editid,
                          question.id,
                        ],
                        (err) => {
                          if (err)
                            console.error("Error updating question:", err);
                        },
                      );
                    } else {
                      const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type,title, answer, created_at, created_by,is_deleted) VALUES (?, ?,?, ?,?, ?, ?,?)`;
                      db.query(
                        insertQuery,
                        [
                          this_data.editid,
                          question.id,
                          1,
                          question.name,
                          question.answer,
                          getCurrentDateAndTime(),
                          user_id,
                          0,
                        ],
                        (err) => {
                          if (err)
                            console.error("Error inserting question:", err);
                        },
                      );
                    }
                  },
                );
              });

              return res.status(200).json({
                error: false,
                message: "Basic details have been updated successfully.",
                data: { arch_id: this_data.editid },
              });
            },
          );
        } else {
          details.created_at = getCurrentDateAndTime();
          details.created_by = user_id;
          details.updated_at = null;
          details.updated_by = null;

          db.query(
            "INSERT INTO arch_basic_details SET ?",
            details,
            function (err, result) {
              if (err) {
                return res
                  .status(500)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              }

              const insertedId = result.insertId;

              parsedQuestions.forEach((question) => {
                const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type,title, answer, created_at, created_by,is_deleted) VALUES (?,?,?, ?, ?, ?, ?,?)`;
                db.query(
                  insertQuery,
                  [
                    this_data.editid,
                    question.id,
                    1,
                    question.name,
                    question.answer,
                    getCurrentDateAndTime(),
                    user_id,
                    0,
                  ],
                  (err) => {
                    if (err) console.error("Error inserting question:", err);
                  },
                );
              });

              return res.status(201).json({
                error: false,
                message: "Basic details have been added successfully.",
                data: { arch_id: insertedId },
              });
            },
          );
        }
      });
    } else {
      details.created_at = getCurrentDateAndTime();
      details.updated_at = null;
      details.updated_by = null;

      db.query(
        "INSERT INTO arch_basic_details SET ?",
        details,
        function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const insertedId = result.insertId;
          parsedQuestions.forEach((question) => {
            const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type, answer, created_at, created_by) VALUES (?, ?,?, ?, ?, ?)`;
            db.query(
              insertQuery,
              [
                insertedId,
                question.question_id,
                1,
                question.answer,
                getCurrentDateAndTime(),
                user_id,
              ],
              (err) => {
                if (err) console.error("Error inserting question:", err);
              },
            );
          });

          return res.status(201).json({
            error: false,
            message: "Basic details have been added successfully.",
            data: { arch_id: insertedId },
          });
        },
      );
    }
  },
  upsertarchRnd: async (req, res) => {
    try {
      const user_id = req.user.id;
      const this_data = req.body;

      const reportFile = req.files.find((file) => file.fieldname === "report");
      const siteImages = req.files.filter(
        (file) => file.fieldname === "site_image",
      );

      const report = reportFile ? getImageWithFoldername(reportFile.path) : "";

      const baseDetails = {
        arch_id: this_data.editid || null,
        keyobservation: this_data.keyobservation || "",
        remarks: this_data.remarks || "",
        summary: this_data.summary || "",
        site_incharge: this_data.site_incharge || "",
        authorized_person: this_data.authorized_person || "",
        report,
        is_deleted: 0,
      };

      const insertSiteImages = (arch_id, images) => {
        const values = images.map((img) => [
          arch_id,
          getImageWithFoldername(img.path),
        ]);
        if (values.length === 0) return;

        const query = "INSERT INTO rnd_site_images (arch_id, images) VALUES ?";

        db.query(query, [values], (err) => {
          if (err) {
            console.error("Failed to insert site images:", err.sqlMessage);
          }
        });
      };

      const insertData = () => {
        const insertDetails = {
          ...baseDetails,
          created_at: getCurrentDateAndTime(),
          created_by: user_id,
          updated_at: null,
          updated_by: null,
        };

        db.query(
          "INSERT INTO study_rnd SET ?",
          insertDetails,
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            insertSiteImages(result.insertId, siteImages);

            return res.status(201).json({
              error: false,
              message: "Rnd has been added successfully.",
            });
          },
        );
      };

      if (this_data.editid) {
        db.query(
          "SELECT * FROM study_rnd WHERE arch_id = ?",
          [this_data.editid],
          (err, results) => {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            if (results.length > 0) {
              const existing = results[0];

              const updateDetails = {
                ...baseDetails,
                report: report || existing.report,
                updated_at: getCurrentDateAndTime(),
                updated_by: user_id,
              };

              db.query(
                "UPDATE study_rnd SET ? WHERE arch_id = ?",
                [updateDetails, this_data.editid],
                (err, result) => {
                  if (err) {
                    return res
                      .status(500)
                      .json({ error: true, message: err.sqlMessage, data: {} });
                  }

                  if (result.affectedRows === 0) {
                    return res.status(400).json({
                      error: true,
                      message: "No record found to update.",
                      data: {},
                    });
                  }

                  // ✅ Only delete & replace images if new ones were uploaded
                  if (siteImages.length > 0) {
                    db.query(
                      "DELETE FROM rnd_site_images WHERE arch_id = ?",
                      [this_data.editid],
                      (err) => {
                        if (err) {
                          console.error(
                            "Failed to delete existing site images:",
                            err.sqlMessage,
                          );
                        }

                        insertSiteImages(this_data.editid, siteImages);

                        return res.status(200).json({
                          error: false,
                          message: "Rnd has been updated successfully.",
                          data: { arch_id: this_data.editid },
                        });
                      },
                    );
                  } else {
                    // No new images — keep existing ones
                    return res.status(200).json({
                      error: false,
                      message: "Rnd has been updated successfully.",
                      data: { arch_id: this_data.editid },
                    });
                  }
                },
              );
            } else {
              insertData();
            }
          },
        );
      } else {
        insertData();
      }
    } catch (error) {
      console.error("Unhandled error:", error);
      return res
        .status(500)
        .json({ error: true, message: "Internal server error", data: {} });
    }
  },
  // upsertarchRnd: async (req, res) => {
  //   try {
  //     const user_id = req.user.id;
  //     const this_data = req.body;

  //     const reportFile = req.files.find((file) => file.fieldname === "report");
  //     const siteImages = req.files.filter(
  //       (file) => file.fieldname === "site_image",
  //     );

  //     const report = reportFile ? getImageWithFoldername(reportFile.path) : "";

  //     const baseDetails = {
  //       arch_id: this_data.editid || null,
  //       keyobservation: this_data.keyobservation || "",
  //       remarks: this_data.remarks || "",
  //       summary: this_data.summary || "",
  //       site_incharge: this_data.site_incharge || "",
  //       authorized_person: this_data.authorized_person || "",
  //       report,
  //       is_deleted: 0,
  //     };

  //     const insertSiteImages = (arch_id, images) => {
  //       const values = images.map((img) => [
  //         arch_id,
  //         getImageWithFoldername(img.path),
  //       ]);
  //       if (values.length === 0) return;

  //       const query = "INSERT INTO rnd_site_images (arch_id, images) VALUES ?";

  //       db.query(query, [values], (err) => {
  //         if (err) {
  //           console.error("Failed to insert site images:", err.sqlMessage);
  //         }
  //       });
  //     };

  //     const insertData = () => {
  //       const insertDetails = {
  //         ...baseDetails,
  //         created_at: getCurrentDateAndTime(),
  //         created_by: user_id,
  //         updated_at: null,
  //         updated_by: null,
  //       };

  //       db.query(
  //         "INSERT INTO study_rnd SET ?",
  //         insertDetails,
  //         (err, result) => {
  //           if (err) {
  //             return res
  //               .status(500)
  //               .json({ error: true, message: err.sqlMessage, data: {} });
  //           }

  //           insertSiteImages(this_data.editid, siteImages);

  //           return res.status(201).json({
  //             error: false,
  //             message: "Rnd has been added successfully.",
  //           });
  //         },
  //       );
  //     };

  //     if (this_data.editid) {
  //       db.query(
  //         "SELECT * FROM study_rnd WHERE arch_id = ?",
  //         [this_data.editid],
  //         (err, results) => {
  //           if (err) {
  //             return res
  //               .status(500)
  //               .json({ error: true, message: err.sqlMessage, data: {} });
  //           }

  //           if (results.length > 0) {
  //             const existing = results[0];

  //             const updateDetails = {
  //               ...baseDetails,
  //               report: report || existing.report,
  //               updated_at: getCurrentDateAndTime(),
  //               updated_by: user_id,
  //             };

  //             db.query(
  //               "UPDATE study_rnd SET ? WHERE arch_id = ?",
  //               [updateDetails, this_data.editid],
  //               (err, result) => {
  //                 if (err) {
  //                   return res
  //                     .status(500)
  //                     .json({ error: true, message: err.sqlMessage, data: {} });
  //                 }

  //                 if (result.affectedRows === 0) {
  //                   return res.status(400).json({
  //                     error: true,
  //                     message: "No record found to update.",
  //                     data: {},
  //                   });
  //                 }

  //                 // Delete existing images
  //                 db.query(
  //                   "DELETE FROM rnd_site_images WHERE arch_id = ?",
  //                   [this_data.editid],
  //                   (err) => {
  //                     if (err) {
  //                       console.error(
  //                         "Failed to delete existing site images:",
  //                         err.sqlMessage,
  //                       );
  //                     }

  //                     // Insert new images
  //                     insertSiteImages(this_data.editid, siteImages);

  //                     return res.status(200).json({
  //                       error: false,
  //                       message: "Rnd has been updated successfully.",
  //                       data: { arch_id: this_data.editid },
  //                     });
  //                   },
  //                 );
  //               },
  //             );
  //           } else {
  //             insertData(); // In case editid is invalid, insert as new
  //           }
  //         },
  //       );
  //     } else {
  //       insertData();
  //     }
  //   } catch (error) {
  //     console.error("Unhandled error:", error);
  //     return res
  //       .status(500)
  //       .json({ error: true, message: "Internal server error", data: {} });
  //   }
  // },

  fetcharchrndyid: (req, res) => {
    const id = req.params.id;
    const sql = `
      SELECT 
        sr.id,
        sr.keyobservation,
        sr.remarks,
        sr.summary,
        sr.site_incharge,
        sr.authorized_person,
        sr.report,
        GROUP_CONCAT(rsi.images) AS image
      FROM study_rnd AS sr
      LEFT JOIN rnd_site_images AS rsi ON rsi.arch_id = sr.arch_id
      WHERE sr.is_deleted = 0 AND sr.arch_id = ?
      GROUP BY sr.id
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const data = result[0];

        // Convert images from comma-separated string to array
        data.image = data.image ? data.image.split(",") : [];

        return res.status(200).json({
          error: false,
          message: "Record fetched",
          data,
        });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },

  // space planning

  getarchSpacePlannigbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
    masp.id,
    COALESCE(masp.name, 'No Name') AS name,
    asp.id AS aspid,
    u.profile_picture,
    ru.profile_picture AS review_profile,
    asp.category_id,
    asp.internalstatus,
    asp.internalremark,
    asp.design_file,
    asp.notes,
  DATE_FORMAT(asp.created_at, '%d %b %Y') as Date,
    asp.clientstatus,
    asp.clientremark,
    asp.team_id,
    asp.is_done
FROM mst_arch_space_planning AS masp
LEFT JOIN arch_space_planning AS asp ON asp.category_id = masp.id AND asp.is_deleted = 0
LEFT JOIN users AS u ON u.id = asp.created_by 
LEFT JOIN users AS ru ON ru.id = asp.review_by 
WHERE masp.is_deleted = 0 
AND masp.arch_id = ?
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },
  getarchSpcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_arch_space_planning where id = ? and is_deleted = 0
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  AddArchSpacePlanning: function (req, res) {
    const files = [];
    let designfile = "";

    req.files.forEach((file) => {
      if (file.fieldname === "design_file") {
        designfile = getImageWithFoldername(file.path);
        files.push(designfile);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      category_id: this_data.editId,
      internalstatus: 0,
      design_file: designfile,
      clientstatus: 0,
      notes: this_data.notes,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_space_planning SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Space planning has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },
  deletearchSpacePlannig: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_space_planning` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "space planning has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updatearchspCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_arch_space_planning` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        name: this_data.name,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_space_planning` SET " +
        "`name` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [fees.name, fees.updated_at, parseInt(fees.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "sp category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  addarchSpacePlanningcategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_space_planning SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  archspinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_space_planning WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchSp: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_space_planning` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
        review_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_space_planning` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ?, " +
        "`review_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Site.internalstatus,
          Site.internalremark,
          parseInt(Site.review_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  archSpClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_space_planning WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  archspupdateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `arch_space_planning` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `arch_space_planning` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  updatearchspstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM arch_space_planning 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 2 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE arch_space_planning SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE arch_space_planning SET is_done = 0, completed_date = NULL, team_id = NULL WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update mst_arch_fees
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  // quotation fees

  getarchFees: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status,is_done from mst_arch_fees where is_deleted = 0 and arch_id = ?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchFees: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_arch_fees` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Fees has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  addarchFees: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const fees = {
      price: this_data.price,
      arch_id: this_data.Id,
      status: this_data.status || 0,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_arch_fees SET ?", fees, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Fees has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  fetcharchFeesbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status from mst_arch_fees where is_deleted = 0 and id = ?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchFees: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const selectSql = "SELECT * FROM `mst_arch_fees` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const fees = {
        price: this_data.price,
        status: this_data.status || 0,
        remark: this_data.remark,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_fees` SET " +
        "`price` = ?, " +
        "`status` = ?, " +
        "`remark` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          fees.price,
          fees.status,
          fees.remark,
          fees.updated_at,
          parseInt(fees.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Fees has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  updatearchquotationstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM mst_arch_fees 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 3 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE mst_arch_fees SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE mst_arch_fees SET is_done = 0, completed_date = NULL, team_id = NULL WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update mst_arch_fees
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  // vendors
  addarchVendorCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_vendor SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  deletearchVendor: function (req, res) {
    const vendorId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_vendor` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      vendorId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Vendor has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getarchvendorcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_arch_vendor where id = ? and is_deleted = 0
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchvendorCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_arch_vendor` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        name: this_data.name,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_vendor` SET " +
        "`name` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [fees.name, fees.updated_at, parseInt(fees.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Vendor category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  getarchVendorbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
  mav.id AS mst_id,
  mav.name,
  COALESCE(av.id) AS avid,
  COALESCE(v.name, '') AS vendors, 
    COALESCE(v.mobile, '') AS mobile_no, 
  COALESCE(av.price) AS price,
   COALESCE(av.remark) AS remark,
  COALESCE(av.status) AS status
FROM mst_arch_vendor AS mav
LEFT JOIN arch_vendor AS av ON av.category_id = mav.id AND av.is_deleted = 0
left join vendors as v on v.id = av.vendors 
WHERE mav.is_deleted = 0 
AND mav.arch_id = ?;
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  addarchVendors: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      vendors: this_data.vendor_id,
      arch_id: this_data.arch_id,
      category_id: this_data.editId,
      price: this_data.price,
      status: 0,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO arch_vendor SET ?", category, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Vendors has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  fetcharchVendorbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,vendors,price,status,remark  from arch_vendor where is_deleted = 0 and id = ?;
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchVendor: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `arch_vendor` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const vendor = {
        vendors: this_data.vendor_id,
        price: this_data.price,
        status: this_data.status,
        remark: this_data.remark,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_vendor` SET " +
        "`vendors` = ?, " +
        "`price` = ?, " +
        "`status` = ?, " +
        "`remark` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          vendor.vendors,
          vendor.price,
          vendor.status,
          vendor.remark,
          vendor.updated_at,
          parseInt(vendor.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Vendor has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  // contractor

  addarchContractorCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_contractor SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  getarchContractorcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_arch_contractor where id = ? and is_deleted = 0
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchContractorCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_arch_contractor` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        name: this_data.name,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_contractor` SET " +
        "`name` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [fees.name, fees.updated_at, parseInt(fees.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Contractor category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  deletearchContractor: function (req, res) {
    const vendorId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_contractor` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      vendorId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Contractor has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getarchContractorbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
  mac.id AS mst_id,
  mac.name,
  COALESCE(ac.id) AS acid,
  COALESCE(v.name, '') AS vendors, 
  COALESCE(v.mobile, '') AS mobile_no, 
  COALESCE(ac.price) AS price,
   COALESCE(ac.remark) AS remark,
  COALESCE(ac.status) AS status
FROM mst_arch_contractor AS mac
LEFT JOIN arch_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
left join vendors as v on v.id = ac.vendors 
WHERE mac.is_deleted = 0 
AND mac.arch_id = ?;
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  addarchContractor: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      vendors: this_data.vendor_id,
      arch_id: this_data.arch_id,
      category_id: this_data.editId,
      price: this_data.price,
      status: 0,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_contractor SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Contractor has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  fetcharchContractorbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,vendors,price,status,remark  from arch_contractor where is_deleted = 0 and id = ?;
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchContractor: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `arch_contractor` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const vendor = {
        vendors: this_data.vendor_id,
        price: this_data.price,
        status: this_data.status,
        remark: this_data.remark,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_contractor` SET " +
        "`vendors` = ?, " +
        "`price` = ?, " +
        "`status` = ?, " +
        "`remark` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          vendor.vendors,
          vendor.price,
          vendor.status,
          vendor.remark,
          vendor.updated_at,
          parseInt(vendor.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Contractor has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  // design concept

  addarchDcCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_arch_dc SET ?", category, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Category has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  getarchDccategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_arch_dc where id = ? and is_deleted = 0
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchDcCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_arch_dc` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const fees = {
        name: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_dc` SET " +
        "`name` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [fees.name, fees.updated_at, parseInt(fees.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Design Concept category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  getarchdcbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
  madc.id,
  COALESCE(madc.name, 'No Name') AS name,
  adc.id AS adcid,
  u.profile_picture,
  ru.profile_picture AS review_profile,
  adc.category_id,
  COALESCE(DATE_FORMAT(adc.created_at, '%d %b %Y'), '') AS date,
  adc.internalstatus,
  adc.internalremark,
  adc.design_file,
  adc.notes,
  adc.clientstatus,
  adc.clientremark
FROM mst_arch_dc AS madc
LEFT JOIN arch_design_concept AS adc ON adc.category_id = madc.id AND adc.is_deleted = 0
LEFT JOIN users AS u ON u.id = adc.created_by 
LEFT JOIN users AS ru ON ru.id = adc.review_by 
WHERE madc.is_deleted = 0 
AND madc.arch_id = ?
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  AddArchdc: function (req, res) {
    const files = [];
    let designfile = "";

    req.files.forEach((file) => {
      if (file.fieldname === "designfile") {
        designfile = getImageWithFoldername(file.path);
        files.push(designfile);
      } else {
        // Unlink unnecessary files
        // unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.id,
      category_id: this_data.editId,
      internalstatus: 0,
      design_file: designfile,
      clientstatus: 0,
      notes: this_data.notes,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_design_concept SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Design Concept has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },
  deletearchDc: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_design_concept` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "design Concept has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archdcinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_design_concept WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchdcintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_design_concept` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
        review_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_design_concept` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ?, " +
        "`review_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Site.internalstatus,
          Site.internalremark,
          parseInt(Site.review_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  archDcClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_design_concept WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  archdcupdateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_design_concept` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `arch_design_concept` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  //  final design
  Addarchfinald: function (req, res) {
    const files = [];
    let upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      status: 0,
      upload: upload,
      remark: this_data.remark,
      type: this_data.type,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO arch_finald SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Arch Final d has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  fetcharchFinaldbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select afd.id,afd.upload,afd.type,afd.status,afd.statusremark,COALESCE(DATE_FORMAT(afd.created_at, '%d %b %Y'), '') AS date,afd.is_done,afd.remark,u.profile_picture
      from arch_finald as afd
      left join users as u
      on u.id = afd.created_by
      where afd.is_deleted = 0 and afd.arch_id =?;
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchfinald: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_finald` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Final d has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archupdatefinaldstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_finald` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        status: this_data.status,
        statusremark: this_data.statusremark,
      };

      const updateSql =
        "UPDATE `arch_finald` SET " +
        "`status` = ?, " +
        "`statusremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.status, Site.statusremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: " Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archfinaldstatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,statusremark from arch_finald WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchfinaldstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;
    console.log("req.body=>");

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM arch_finald 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 4 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE arch_finald SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE arch_finald SET is_done = 0, completed_date = NULL, team_id = NULL WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  // 3D

  addarchThreeDCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_threed SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  getarch3dcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,title from mst_arch_threed where id = ? and is_deleted = 0
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearch3dCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const selectSql = "SELECT * FROM `mst_arch_threed` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const fees = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_threed` SET " +
        "`title` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [fees.title, fees.updated_at, parseInt(fees.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "3d category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  getarch3dbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
  mt.id,
  td.vendor,
  td.phone,
  COALESCE(mt.title, 'No Name') AS name,
  td.id AS tdid,
  td.designphoto,
  td.notes,
  td.is_done,
  u.profile_picture,
  ru.profile_picture AS review_profile,
      COALESCE(DATE_FORMAT(td.created_at, '%d %b %Y'), '') AS date,
  td.category_id,
  td.internalstatus,
  td.internalremark,
  td.clientstatus,
  td.clientremark
FROM mst_arch_threed AS mt
LEFT JOIN arch_threed AS td ON td.category_id = mt.id AND td.is_deleted = 0
LEFT JOIN users AS u ON u.id = td.created_by 
LEFT JOIN users AS ru ON ru.id = td.review_by 
WHERE mt.is_deleted = 0 
AND mt.arch_id = ?
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  AddarchThreeD: function (req, res) {
    const files = [];
    let designphoto = "";

    req.files.forEach((file) => {
      if (file.fieldname === "designphoto") {
        designphoto = getImageWithFoldername(file.path);
        files.push(designphoto);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const technical = {
      category_id: this_data.editId,
      arch_id: this_data.id,
      vendor: this_data.vendor,
      phone: this_data.phone || null,
      notes: this_data.notes,
      designphoto: designphoto,
      internalstatus: 0,
      clientstatus: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_threed SET ?",
      technical,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "3 D has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  deletearchThreed: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_threed` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "3D has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updatearch3DClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_threed` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus || 0,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `arch_threed` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archthreeDClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_threed WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  arch3dinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_threed WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearch3dintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_threed` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
        review_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_threed` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ?, " +
        "`review_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Site.internalstatus,
          Site.internalremark,
          parseInt(Site.review_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  updatearchthreedstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM arch_threed 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 5 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE arch_threed SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE arch_threed SET is_done = 0, completed_date = NULL, team_id = NULL WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  // structure

  addarchmststructure: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_structure SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  archstructuebyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
    mas.id AS mad_id,
    mas.name,
    COALESCE(ars.id, 0) AS asid,
    u.profile_picture,
    COALESCE(ars.zed_upload, '') AS zed_upload,
    COALESCE(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
    COALESCE(ars.agency_upload, '') AS agency_upload,
    COALESCE(ars.agency_name, '') AS agency_name,
        COALESCE(ars.notes, '') AS notes,
      COALESCE(ars.internalstatus, '') AS internalstatus,
        COALESCE(ars.internalremark, '') AS internalremark,
          COALESCE(ars.clientstatus, '') AS clientstatus,
    COALESCE(ars.clientremark, '') AS clientremark,
    COALESCE(ars.remark, '') AS remark
  FROM mst_arch_structure AS mas
  LEFT JOIN arch_structure AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?`;

      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  Addarchstructure: function (req, res) {
    const files = [];
    let zed_upload = "";
    let agency_upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "zed_upload") {
        zed_upload = getImageWithFoldername(file.path);
        files.push(zed_upload);
      } else if (file.fieldname === "agency_upload") {
        agency_upload = getImageWithFoldername(file.path);
        files.push(agency_upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      category_id: this_data.editId,
      arch_id: this_data.ID,
      internalstatus: 0,
      clientstatus: 0,
      zed_upload: zed_upload,
      agency_upload: agency_upload,
      agency_name: this_data.agency_name,
      notes: this_data.notes,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_structure SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Arch Structure has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  deletearchStructure: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_structure` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Structure has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updatearchstructureClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_structure` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus || 0,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `arch_structure` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archstructureClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_structure WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  archstructureinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_structure WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchstructureintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_structure` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
      };

      const updateSql =
        "UPDATE `arch_structure` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.internalstatus, Site.internalremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  // mepf

  addarchmstMepf: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_mepf SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  archmepfbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
    mas.id AS mad_id,
    mas.name,
    COALESCE(ars.id, 0) AS asid,
    u.profile_picture,
    COALESCE(ars.zed_upload, '') AS zed_upload,
    COALESCE(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
    COALESCE(ars.agency_upload, '') AS agency_upload,
    COALESCE(ars.agency_name, '') AS agency_name,
      COALESCE(ars.internalstatus, '') AS internalstatus,
        COALESCE(ars.internalremark, '') AS internalremark,
          COALESCE(ars.clientstatus, '') AS clientstatus,
    COALESCE(ars.clientremark, '') AS clientremark,
    COALESCE(ars.remark, '') AS remark
  FROM mst_arch_mepf AS mas
  LEFT JOIN arch_mepf AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?`;

      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  Addarchmepf: function (req, res) {
    const files = [];
    let zed_upload = "";
    let agency_upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "zed_upload") {
        zed_upload = getImageWithFoldername(file.path);
        files.push(zed_upload);
      } else if (file.fieldname === "agency_upload") {
        agency_upload = getImageWithFoldername(file.path);
        files.push(agency_upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      category_id: this_data.editId,
      arch_id: this_data.ID,
      internalstatus: 0,
      clientstatus: 0,
      zed_upload: zed_upload,
      agency_upload: agency_upload,
      agency_name: this_data.agency_name,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO arch_mepf SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Arch Mepf has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  deletearchMepf: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_mepf` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Mepf has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updatearchmepfClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_mepf` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus || 0,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `arch_mepf` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archmepfClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_mepf WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  archmepfinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_mepf WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchmepfintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `arch_mepf` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
      };

      const updateSql =
        "UPDATE `arch_mepf` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.internalstatus, Site.internalremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  addarchdrawing: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_drawing SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  archdrwaingbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
        mad.id AS mad_id,
        mad.name,ad.is_done,
        COALESCE(ad.id, 0) AS adid,
         u.profile_picture,
    ru.profile_picture AS review_profile,
        COALESCE(ad.internalstatus, '') AS internalstatus,
          COALESCE(ad.notes, '') AS notes,
        COALESCE(ad.design, '') AS design,
         COALESCE(DATE_FORMAT(ad.created_at, '%d %b %Y'), '') AS date,
        COALESCE(ad.internalremark, '') AS internalremark,
        COALESCE(ad.clientstatus, '') AS clientstatus,
        COALESCE(ad.clientremark, '') AS clientremark
        FROM mst_arch_drawing AS mad
        LEFT JOIN arch_drawing AS ad ON ad.category_id = mad.id AND ad.is_deleted = 0
        LEFT JOIN users AS u ON u.id = ad.created_by 
       LEFT JOIN users AS ru ON ru.id = ad.review_by 
        WHERE mad.is_deleted = 0 
        AND mad.arch_id = ?`;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  Addarchidrawing: function (req, res) {
    const files = [];
    let design = "";

    req.files.forEach((file) => {
      if (file.fieldname === "design") {
        design = getImageWithFoldername(file.path);
        files.push(design);
      } else {
        // Unlink unnecessary files
        // unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      category_id: this_data.editId,
      internalstatus: 0,
      design: design,
      clientstatus: 0,
      notes: this_data.notes,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_drawing SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Arch Drawing has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  deletearchdrawing: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_drawing` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Drawing has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from arch_drawing WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchIs: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `arch_drawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus,
        internalremark: this_data.internalremark,
        review_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_drawing` SET " +
        "`internalstatus` = ?, " +
        "`internalremark` = ?, " +
        "`review_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Site.internalstatus,
          Site.internalremark,
          parseInt(Site.review_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Internal Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from arch_drawing WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  archupdateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `arch_drawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus,
        clientremark: this_data.clientremark,
        client_review_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_drawing` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ?, " +
        "`client_review_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          Site.clientstatus,
          Site.clientremark,
          parseInt(Site.client_review_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Client Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  getarchQuotation: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status,is_done from mst_arch_quotation where is_deleted = 0 and arch_id = ?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchQuotation: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_arch_quotation` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Fees has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  addarchquotation: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const fees = {
      price: this_data.price,
      arch_id: this_data.Id,
      status: this_data.status || 0,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_quotation SET ?",
      fees,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "quotation has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  fetcharchquotationbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status from mst_arch_quotation where is_deleted = 0 and id = ?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchquotation: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_arch_quotation` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        price: this_data.price,
        status: this_data.status || 0,
        remark: this_data.remark,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_arch_quotation` SET " +
        "`price` = ?, " +
        "`status` = ?, " +
        "`remark` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          fees.price,
          fees.status,
          fees.remark,
          fees.updated_at,
          parseInt(fees.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Fees has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  Addarchdocument: function (req, res) {
    const files = [];
    let upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      status: 0,
      upload: upload,
      remark: this_data.remark,
      type: this_data.type,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_document SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Arch Document has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  fetcharchdocumentbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select mad.id,mad.upload,mad.type,mad.status,mad.statusremark,mad.is_done,mad.remark,u.profile_picture
        from mst_arch_document as mad
        left join users as u
        on u.id = mad.created_by
        where mad.is_deleted = 0 and mad.arch_id =?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchdocument: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_arch_document` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "document has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archupdatedocumentstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_arch_document` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        status: this_data.status,
        statusremark: this_data.statusremark,
      };

      const updateSql =
        "UPDATE `mst_arch_document` SET " +
        "`status` = ?, " +
        "`statusremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.status, Site.statusremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: " Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archdocumentstatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,statusremark from mst_arch_document WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  Addarchfinalf: function (req, res) {
    const files = [];
    let upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      status: 0,
      upload: upload,
      remark: this_data.remark,
      type: this_data.type,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_final_files SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Arch Final Files has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  fetcharchdfinalfbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select mad.id,mad.upload,mad.type,mad.status,mad.statusremark,mad.remark,mad.is_done,u.profile_picture
        from mst_final_files as mad
        left join users as u
        on u.id = mad.created_by
        where mad.is_deleted = 0 and mad.arch_id =?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchfinalf: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_final_files` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "final files has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archupdatefinalfstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_final_files` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        status: this_data.status,
        statusremark: this_data.statusremark,
      };

      const updateSql =
        "UPDATE `mst_final_files` SET " +
        "`status` = ?, " +
        "`statusremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.status, Site.statusremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: " Status has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archfinalfstatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,statusremark from mst_final_files WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  addarchmstageny: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_agency SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  archagencybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
        maa.id AS mad_id,
        maa.name,
        COALESCE(aa.id, 0) AS aaid,
         u.profile_picture,
         aa.is_done,
        COALESCE(aa.zed_upload, '') AS zed_upload,
       COALESCE(DATE_FORMAT(aa.created_at, '%d %b %Y'), '') AS date,
        COALESCE(aa.agency_upload, '') AS agency_upload,
        COALESCE(aa.agency_name, '') AS agency_name,
        COALESCE(aa.status, '') AS status,
        COALESCE(aa.remark, '') AS remark
        FROM mst_arch_agency AS maa
        LEFT JOIN arch_agency AS aa ON aa.category_id = maa.id AND aa.is_deleted = 0
        LEFT JOIN users AS u ON u.id = aa.created_by 
        WHERE maa.is_deleted = 0 
        AND maa.arch_id = ?`;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  Addarchagency: function (req, res) {
    const files = [];
    let zed_upload = "";
    let agency_upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "zed_upload") {
        zed_upload = getImageWithFoldername(file.path);
        files.push(zed_upload);
      } else if (file.fieldname === "agency_upload") {
        agency_upload = getImageWithFoldername(file.path);
        files.push(agency_upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      category_id: this_data.editId,
      arch_id: this_data.ID,
      status: 0,
      zed_upload: zed_upload,
      agency_upload: agency_upload,
      agency_name: this_data.agency_name,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO arch_agency SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Arch Agency has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  deletearchagency: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_agency` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Agency has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  archagencystatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,remark from arch_agency WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchagency: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `arch_agency` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        status: this_data.status,
        remark: this_data.remark,
      };

      const updateSql =
        "UPDATE `arch_agency` SET " +
        "`status` = ?, " +
        "`remark` = ? " +
        "WHERE `id` = ?";

      db.query(updateSql, [Site.status, Site.remark, id], (err, result) => {
        if (err) {
          const data = { error: true, message: err.sqlMessage, data: {} };
          return res.status(500).json(data); // Use 500 for server errors
        }

        const response = {
          error: false,
          message: "Agency has been updated...",
          data: {},
        };

        res.status(200).json(response); // Use 200 for successful updates
      });
    });
  },

  fetcharchsiteengbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select mas.id,mas.report,mas.remark,u.profile_picture,
             COALESCE(DATE_FORMAT(mas.created_at, '%d %b %Y'), '') AS date,mas.is_done
        from mst_arch_site_eng as mas
        left join users as u
        on u.id = mas.created_by
        where mas.is_deleted = 0 and mas.arch_id =?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchsiteeng: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_arch_site_eng` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Site eng has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  Addarchsiteeng: function (req, res) {
    const files = [];
    let report = "";

    req.files.forEach((file) => {
      if (file.fieldname === "report") {
        report = getImageWithFoldername(file.path);
        files.push(report);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      report: report,
      remark: this_data.remark,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_site_eng SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Arch site eng has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  fetcharchriskbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select marm.id,marm.upload,marm.remark,marm.agency,u.profile_picture,marm.is_done,
             COALESCE(DATE_FORMAT(marm.date, '%d %b %Y %I:%i %p'), '') AS date
        from mst_arch_risk_matrix as marm
        left join users as u
        on u.id = marm.created_by
        where marm.is_deleted = 0 and marm.arch_id =?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchrisk: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mst_arch_risk_matrix` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Risk Matrix has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  Addarchrisk: function (req, res) {
    const files = [];
    let upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      upload: upload,
      agency: this_data.agency,
      date: getCurrentDateAndTime(),
      remark: this_data.remark,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_risk_matrix SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Risk matrix has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  archmaterialcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
          mam.id AS mam_id,
          mam.title,
          COALESCE(m.id) AS mid,
          m.is_done,
          COALESCE(v.name, '') AS vendors, 
          COALESCE(v.mobile, '') AS phone, 
          COALESCE(m.material_photo, '') AS material_photo,
          COALESCE(m.material_name, '') AS material_name,
          COALESCE(m.rate, '') AS rate,
          COALESCE(m.remark, '') AS remark,
          COALESCE(m.status, '') AS status
          FROM mst_arch_material AS mam
          LEFT JOIN arch_material AS m ON m.category_id = mam.id AND m.is_deleted = 0
          left join vendors as v on v.id = m.vendor 
          WHERE mam.is_deleted = 0 
          AND mam.arch_id = ?`;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchmaterial: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `arch_material` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      feesId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "material has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  addarchMaterialCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      arch_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_arch_material SET ?",
      category,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Category has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  AddarchMaterial: function (req, res) {
    const files = [];
    let materialphoto = "";

    req.files.forEach((file) => {
      if (file.fieldname === "materialphoto") {
        materialphoto = getImageWithFoldername(file.path);
        files.push(materialphoto);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.ID,
      category_id: this_data.editId,
      vendor: this_data.vendor_id,
      material_photo: materialphoto,
      material_name: this_data.materialName,
      rate: this_data.rate,
      status: this_data.status || 0,
      remark: this_data.remark,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO arch_material SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Material has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  archmaterialupdate: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const selectSql = "SELECT * FROM `arch_material` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const concpet = {
        vendor: this_data.vendor_id,
        materialName: this_data.materialName,
        rate: this_data.rate,
        status: this_data.status || 0,
        remark: this_data.remark,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `arch_material` SET " +
        "`vendor` = ?, " +
        "`material_name` = ?, " +
        "`rate` = ?, " +
        "`status` = ?, " +
        "`remark` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          concpet.vendor,
          concpet.materialName,
          concpet.rate,
          concpet.status,
          concpet.remark,
          concpet.updated_at,
          parseInt(concpet.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "material has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  archmaterialbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `select * from arch_material where id = ?`;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  addarchitectureschedule: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const schedule = {
      source_id: this_data.editId,
      source_type: 1,
      fromdate: this_data.fromdate,
      todate: this_data.todate,
      type: this_data.type,
      status: 0,
      team_member: JSON.stringify(this_data.team_member), // Save as JSON or handle as needed
      agency: this_data.agency,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO schedule SET ?",
      schedule,
      async function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const scheduleId = result.insertId;

        // Generate all dates from fromdate to todate
        const startDate = new Date(this_data.fromdate);
        const endDate = new Date(this_data.todate);
        const dateList = [];

        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          dateList.push(new Date(d));
        }

        // Insert task entries
        const insertTasks = [];

        dateList.forEach((dateObj) => {
          const formattedDate = dateObj.toISOString().split("T")[0]; // 'YYYY-MM-DD'

          this_data.team_member.forEach((memberId) => {
            const task = {
              schedule_id: scheduleId,
              mst_department_id: 3,
              userid: user_id,
              priority: 0,
              due_date: formattedDate,
              date: formattedDate,
              assign_to: memberId,
              task: this_data.type,
              status: 0,
              created_at: getCurrentDateAndTime(),
              created_by: user_id,
              is_deleted: 0,
            };

            insertTasks.push(task);
          });
        });

        // Bulk insert into task table
        if (insertTasks.length > 0) {
          const values = insertTasks.map((task) => Object.values(task));
          const columns = Object.keys(insertTasks[0]).join(", ");
          const placeholders = values
            .map(
              () =>
                "(" +
                Object.keys(insertTasks[0])
                  .map(() => "?")
                  .join(", ") +
                ")",
            )
            .join(", ");

          const insertQuery = `INSERT INTO todos (${columns}) VALUES ${placeholders}`;

          db.query(insertQuery, values.flat(), (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            res.status(201).json({
              error: false,
              message: "Schedule and Tasks have been added successfully.",
              data: { id: scheduleId },
            });
          });
        } else {
          res.status(201).json({
            error: false,
            message: "Schedule added, but no tasks generated.",
            data: { id: scheduleId },
          });
        }
      },
    );
  },

  getarchschedule: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select 
       s.id,
      s.source_id,
      s.type,
      s.agency,
      s.status,
      s.remark,
      s.status_remark,
      s.is_done,
       DATE_FORMAT(s.fromdate, '%d-%m-%Y') AS fromdate,
    DATE_FORMAT(s.todate, '%d-%m-%Y') AS todate,
    GROUP_CONCAT(u.first_name) AS first_name
    from schedule as s
    left join  users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
    where s.is_deleted = 0 and s.source_type = 1 and s.source_id = ?
    GROUP BY 
     s.id,
      s.source_id,
      s.type,
      s.agency,
      s.remark,
      s.status
      `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  deletearchSchedule: function (req, res) {
    const scheduleId = req.params.id;
    const id = req.user.id;
    const currentTime = getCurrentDateAndTime();

    const deleteScheduleSql = `
      UPDATE schedule 
      SET is_deleted = 1, updated_by = ?, updated_at = ? 
      WHERE id = ?
    `;

    const deleteTaskSql = `
      UPDATE todos 
      SET is_deleted = 1, updated_by = ?, updated_at = ? 
      WHERE schedule_id = ?
    `;

    // First delete the schedule
    db.query(
      deleteScheduleSql,
      [id, currentTime, scheduleId],
      function (err, result) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        // Then delete associated tasks
        db.query(
          deleteTaskSql,
          [id, currentTime, scheduleId],
          function (err2, result2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message:
                "Schedule and associated tasks have been marked as deleted!",
              data: {},
            });
          },
        );
      },
    );
  },

  archschedulestatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,status_remark from schedule WHERE is_deleted = 0 and  id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updatearchscheduleStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `schedule` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Schedule not found", data: {} });
      }

      const Site = {
        status: this_data.status,
        status_remark: this_data.status_remark,
      };

      const updateScheduleSql = `
        UPDATE schedule SET status = ?, status_remark = ? WHERE id = ?
      `;

      db.query(
        updateScheduleSql,
        [Site.status, Site.status_remark, id],
        (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Now update todos linked to this schedule
          const updateTodosSql = `
          UPDATE todos SET status = ? WHERE schedule_id = ?
        `;

          db.query(updateTodosSql, [Site.status, id], (err) => {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            res.status(200).json({
              error: false,
              message:
                "Schedule and associated Todos status updated successfully.",
              data: {},
            });
          });
        },
      );
    });
  },

  getArchDetails: async function (req, res) {
    var sql = "select * from mst_arch_details where is_deleted = 0";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(201)
            .json({ error: false, message: "Not found", data: [] });
        }
      }
    });
  },

  getArchDaysbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `SELECT no_of_days 
               FROM new_mst_file_project_details 
               WHERE project_id = ? AND application_name = 'architecture_design'`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },

  getArchFilesbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `
          select nmf.*,nmfd.id as ID,nmfd.project_id,nmfd.project_name as Application_number,nmfd.assign_to_hod,nmfd.assign_members,nmfd.assign_on,nmfd.days,nmfd.completed_by 
          from new_mst_file as nmf
          left join new_mst_file_details as nmfd
          on nmfd.project_id = nmf.id
          where nmf.id = ? and nmfd.source_type = 2 and nmfd.is_deleted = 0 `;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },

  updateArch: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const fileData = req.body;
    const dynamicFields = req.body.dynamicFields;
    const ID = req.body.ID;

    const fileValues = {
      client_id: fileData.client_id,
      company_name: fileData.company_name,
      email: fileData.email,
      phone: fileData.phone,
      project_name: fileData.project_name,
      project_type: fileData.project_type,
      category: fileData.category,
      archcategory: fileData.archcategory,
      authority: fileData.authority,
      google_location: fileData.google_location,
      lat: fileData.lat,
      long: fileData.long,
      address: fileData.address,
      land_type: fileData.land_type,
      village: fileData.village,
      tpscheme: fileData.tpscheme ? fileData.tpscheme : null,
      op_no: fileData.op_no,
      fp_no: fileData.fp_no,
      moje: fileData.moje,
      ward_no: fileData.ward_no,
      cs_no: fileData.cs_no,
      rs_no: fileData.rs_no,
      b_no: fileData.b_no,
      file_type: fileData.file_type,
      fire_noc: fileData.fire_noc,
      updated_by: user_id,
      updated_at: getCurrentDateAndTime(),
    };

    try {
      // Update the main file record in new_mst_file
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE new_mst_file SET ? WHERE id = ?",
          [fileValues, ID],
          (err) => {
            if (err) {
              console.error("Error updating File data:", err);
              reject("Failed to update File data");
            } else {
              resolve();
            }
          },
        );
      });

      // Now process the dynamic fields (new_mst_file_details)
      const promises = dynamicFields.map((field) => {
        return new Promise((resolve, reject) => {
          const fieldData = [
            ID,
            field.project_name,
            field.assign_to_hod,
            JSON.stringify(field.assign_members),
            field.days,
            field.assign_on,
            field.completed_by ? field.completed_by : null,
            user_id,
            getCurrentDateAndTime(),
            0,
          ];

          const checkQuery =
            "SELECT id FROM new_mst_file_details WHERE source_type = 2 and project_id = ? AND project_name = ?";
          db.query(checkQuery, [ID, field.project_name], (err, results) => {
            if (err) {
              console.error("Error checking existing field:", err);
              reject("Failed to check existing field");
            } else {
              if (results.length > 0) {
                // Update existing dynamic field
                const updateQuery = `
                  UPDATE new_mst_file_details
                  SET project_name = ?, assign_to_hod = ?, assign_members = ?, days = ?, assign_on = ?, completed_by = ?, updated_by = ?, updated_at = ?
                  WHERE source_type = 2 and project_id = ? AND project_name = ?
                `;
                const updateValues = [
                  field.project_name,
                  field.assign_to_hod,
                  JSON.stringify(field.assign_members),
                  field.days,
                  field.assign_on,
                  field.completed_by ? field.completed_by : null,
                  user_id,
                  getCurrentDateAndTime(),
                  ID,
                  field.project_name,
                ];

                db.query(updateQuery, updateValues, (err) => {
                  if (err) {
                    console.error("Error updating File details:", err);
                    reject("Failed to update File details");
                  } else {
                    // After updating, proceed to insert tasks into todos
                    const fileDetailsId = results[0].id;
                    insertTodoTasks(fileDetailsId, field, user_id);
                    resolve();
                  }
                });
              } else {
                // Insert new dynamic field
                const insertQuery = `
                  INSERT INTO new_mst_file_details (
                    project_id, project_name, assign_to_hod, assign_members, days, assign_on, completed_by, created_by, created_at, is_deleted
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                db.query(insertQuery, fieldData, (err, result) => {
                  if (err) {
                    console.error("Error inserting new File details:", err);
                    reject("Failed to insert new File details");
                  } else {
                    console.log("Inserted ID:", result.insertId);
                    // After inserting, insert tasks into todos
                    const fileDetailsId = result.insertId;
                    insertTodoTasks(fileDetailsId, field, user_id);
                    resolve(result.insertId);
                  }
                });
              }
            }
          });
        });
      });

      // Wait for all dynamic fields to be updated or inserted
      await Promise.all(promises);

      res.status(200).json({
        error: false,
        message: "File and details updated successfully",
      });
    } catch (error) {
      console.error("Error in update function:", error);
      res.status(500).json({
        error: true,
        message: error.message || "An unexpected error occurred",
        data: {},
      });
    }

    // Helper function to insert tasks into the todos table
    function insertTodoTasks(fileDetailsId, field, user_id) {
      const insertTodoQuery = `
        INSERT INTO todos (task, assign_to, due_date, file_id,status, created_by, created_at, is_deleted)
        VALUES (?, ?, ?, ?,?, ?, ?, ?)
      `;

      const updateTodoQuery = `
        UPDATE todos 
        SET task = ?, assign_to = ?, due_date = ?, file_id = ?, updated_by = ?, updated_at = ?
        WHERE file_id = ? AND assign_to = ?
      `;

      // Task name based on project_name value
      let taskName = "";

      if (field.project_name == 1) {
        taskName = "Basic Details";
      } else if (field.project_name == 2) {
        taskName = "Drawing";
      } else if (field.project_name == 3) {
        taskName = "Quotation";
      } else if (field.project_name == 4) {
        taskName = "Documents";
      } else if (field.project_name == 5) {
        taskName = "Final Files";
      } else if (field.project_name == 6) {
        taskName = "Agency";
      } else if (field.project_name == 7) {
        taskName = "Final Drawing";
      } else if (field.project_name == 8) {
        taskName = "Material";
      } else if (field.project_name == 9) {
        taskName = "Schedule";
      } else if (field.project_name == 10) {
        taskName = "Site Engineer";
      } else if (field.project_name == 11) {
        taskName = "Risk Matrix";
      }

      if (taskName) {
        // Update or insert task for assign_to_hod
        db.query(
          `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
          [fileDetailsId, field.assign_to_hod],
          (err, result) => {
            if (err) {
              console.error("Error checking for existing task:", err);
            } else {
              if (result.length > 0) {
                // Task exists, update it
                db.query(
                  updateTodoQuery,
                  [
                    taskName, // task (project_name)
                    field.assign_to_hod, // assign_to_hod
                    field.completed_by, // due_date
                    fileDetailsId,
                    user_id,
                    getCurrentDateAndTime(),
                    fileDetailsId,
                    field.assign_to_hod,
                  ],
                  (err) => {
                    if (err) {
                      console.error("Error updating assign_to_hod task:", err);
                    }
                  },
                );
              } else {
                // Task does not exist, insert it
                db.query(
                  insertTodoQuery,
                  [
                    taskName, // task (project_name)
                    field.assign_to_hod, // assign_to_hod
                    field.completed_by, // due_date
                    fileDetailsId,
                    0,
                    user_id,
                    getCurrentDateAndTime(),
                    0, // is_deleted
                  ],
                  (err) => {
                    if (err) {
                      console.error("Error inserting assign_to_hod task:", err);
                    }
                  },
                );
              }
            }
          },
        );

        // Update or insert tasks for each member in assign_members
        field.assign_members.forEach((member) => {
          db.query(
            `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
            [fileDetailsId, member],
            (err, result) => {
              if (err) {
                console.error("Error checking for existing task:", err);
              } else {
                if (result.length > 0) {
                  // Task exists, update it
                  db.query(
                    updateTodoQuery,
                    [
                      taskName, // task (project_name)
                      member, // assign member
                      field.completed_by, // due_date
                      fileDetailsId,
                      user_id,
                      getCurrentDateAndTime(),
                      fileDetailsId,
                      member,
                    ],
                    (err) => {
                      if (err) {
                        console.error(
                          "Error updating assign_member task:",
                          err,
                        );
                      }
                    },
                  );
                } else {
                  // Task does not exist, insert it
                  db.query(
                    insertTodoQuery,
                    [
                      taskName,
                      member, // assign member
                      field.completed_by,
                      fileDetailsId,
                      0,
                      user_id,
                      getCurrentDateAndTime(),
                      0, // is_deleted
                    ],
                    (err) => {
                      if (err) {
                        console.error(
                          "Error inserting assign_member task:",
                          err,
                        );
                      }
                    },
                  );
                }
              }
            },
          );
        });
      }
    }
  },

  getArchData: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `SELECT 
    nmfd.id,
    nmfd.assign_to_hod,
    nmf.case_id,
     nmf.project_name, 
    nmfd.assign_members,
    DATE_FORMAT(nmfd.assign_on, '%Y-%m-%d') AS assign_on,
    DATE_FORMAT(nmfd.completed_by, '%Y-%m-%d') AS completed_by,
    mid.title,
      au.first_name as client_name,
    hu.profile_picture AS hod_pictures,
    hu.first_name AS hod_name,
     GROUP_CONCAT(u.first_name) AS assign_name,
    GROUP_CONCAT(u.profile_picture) AS assign_picture
FROM 
    new_mst_file_details AS nmfd
LEFT JOIN 
    new_mst_file AS nmf ON nmf.id = nmfd.project_id
LEFT JOIN 
    mst_arch_details AS mid ON mid.id = nmfd.project_name
LEFT JOIN 
    users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      left join users as au on au.id = nmf.client_id
LEFT JOIN 
    users AS hu ON hu.id = nmfd.assign_to_hod
WHERE 
    nmf.id = ? and nmfd.source_type = 2
GROUP BY 
    nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
    nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture, hu.first_name
;
`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        console.log("result=>", result);
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },

  Archquestionbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `SELECT 
                  mptc.id, 
                  mptc.title, 
                  mctq.id AS question_id, 
                  mctq.title AS question,
                  mqa.answer
               FROM new_mst_file AS nmf
               LEFT JOIN mst_project_type_category AS mptc ON mptc.project_type_id = nmf.archcategory and  mptc.source_type = 1
               LEFT JOIN mst_category_type_question AS mctq ON mctq.category_id = mptc.id and mctq.type = 1
               left join mst_question_answer as mqa on mqa.question_id = mctq.id and mqa.type = 1
               WHERE nmf.id =?`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res.status(201).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }

      // Grouping logic
      const groupedData = result.reduce((acc, row) => {
        let existingItem = acc.find((item) => item.id === row.id);

        if (!existingItem) {
          existingItem = {
            id: row.id,
            title: row.title,
            question: [],
          };
          acc.push(existingItem);
        }

        // Only add question if question_id is not null
        if (row.question_id) {
          existingItem.question.push({
            id: row.question_id,
            name: row.question,
            answer: row.answer,
          });
        }

        return acc;
      }, []);

      res
        .status(201)
        .json({ error: false, message: "Record fetched", data: groupedData });
    });
  },

  getCategory: (req, res) => {
    var sql = `
        select * from mst_category
         `;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  AddarchfinalDrawing: function (req, res) {
    const files = [];
    let upload = "";

    req.files.forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      arch_id: this_data.arch_id,
      upload: upload,
      remark: this_data.remark,
      type: this_data.type,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_final_drawing SET ?",
      planning,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: " Final Drawing has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  fetcharchdfinaldbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select mad.id,mad.upload,mad.type,mad.on_site,mad.remark,u.profile_picture,mad.is_done
        from mst_final_drawing as mad
        left join users as u
        on u.id = mad.created_by
        where mad.is_deleted = 0 and mad.arch_id =?;
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  updateOnsite: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT on_site FROM `mst_final_drawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "drawing not found", data: {} });
      }

      const Site = {
        on_site: this_data.is_checked,
      };

      const updateScheduleSql = `
        UPDATE mst_final_drawing SET on_site = ? WHERE id = ?
      `;

      db.query(updateScheduleSql, [Site.on_site, id], (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        return res.status(200).json({
          error: false,
          message: "On-site status updated successfully",
          data: {},
        });
      });
    });
  },

  updatearchbdstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT arch_id, is_done FROM `arch_basic_details` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const archid = result[0].arch_id;

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 1 AND project_id = ?
      `;

      db.query(checksql, [archid], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE arch_basic_details 
            SET is_done = 1, completed_date = NOW() 
            WHERE id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE arch_basic_details 
            SET is_done = 0, completed_date = null
            WHERE id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },
  updatearchdrawingstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM arch_drawing 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 6 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE arch_drawing SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE arch_drawing SET is_done = 0, completed_date = NULL, team_id = NULL WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchdocumentstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `mst_arch_document` WHERE `arch_id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 4 AND project_id = ?
      `;

      db.query(checksql, [id], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE mst_arch_document 
            SET is_done = 1, completed_date = NOW() 
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE mst_arch_document 
            SET is_done = 0, completed_date = null
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchfinalfstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `mst_final_files` WHERE `arch_id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 5 AND project_id = ?
      `;

      db.query(checksql, [id], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE mst_final_files 
            SET is_done = 1, completed_date = NOW() 
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE mst_final_files 
            SET is_done = 0, completed_date = null
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  // updatearchfinaldstage: function (req, res) {
  //   const this_data = req.body;
  //   const id = parseInt(this_data.id);

  //   const selectSql =
  //     "SELECT  id,is_done FROM `mst_final_drawing` WHERE `arch_id` = ?";

  //   db.query(selectSql, [id], (err, result) => {
  //     if (err) {
  //       return res
  //         .status(500)
  //         .json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (result.length === 0) {
  //       return res
  //         .status(404)
  //         .json({ error: true, message: "Record not found", data: {} });
  //     }

  //     const checksql = `
  //       SELECT id FROM new_mst_file_details
  //       WHERE source_type = 2 AND project_name = 7 AND project_id = ?
  //     `;

  //     db.query(checksql, [id], (err, checkresult) => {
  //       if (err) {
  //         return res
  //           .status(500)
  //           .json({ error: true, message: err.sqlMessage, data: {} });
  //       }

  //       if (checkresult.length === 0) {
  //         return res.status(404).json({
  //           error: true,
  //           message: "File ID not found for given arch_id",
  //           data: {},
  //         });
  //       }

  //       const fileid = checkresult[0].id;
  //       const stageCompleted = parseInt(this_data.stage_completed);

  //       let updateScheduleSql, updateTodoSql;

  //       if (stageCompleted === 1) {
  //         updateScheduleSql = `
  //           UPDATE mst_final_drawing
  //           SET is_done = 1, completed_date = NOW()
  //           WHERE arch_id = ?
  //         `;
  //         updateTodoSql = `
  //           UPDATE todos
  //           SET status = 1
  //           WHERE file_id = ?
  //         `;
  //       } else {
  //         updateScheduleSql = `
  //           UPDATE mst_final_drawing
  //           SET is_done = 0, completed_date = null
  //           WHERE arch_id = ?
  //         `;
  //         updateTodoSql = `
  //           UPDATE todos
  //           SET status = 0
  //           WHERE file_id = ?
  //         `;
  //       }

  //       db.query(updateScheduleSql, [id], (err) => {
  //         if (err) {
  //           return res
  //             .status(500)
  //             .json({ error: true, message: err.sqlMessage, data: {} });
  //         }

  //         db.query(updateTodoSql, [fileid], (err2) => {
  //           if (err2) {
  //             return res
  //               .status(500)
  //               .json({ error: true, message: err2.sqlMessage, data: {} });
  //           }

  //           return res.status(200).json({
  //             error: false,
  //             message: "Stage and task updated successfully",
  //             data: {},
  //           });
  //         });
  //       });
  //     });
  //   });
  // },

  updatearchagencystage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `arch_agency` WHERE `arch_id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 6 AND project_id = ?
      `;

      db.query(checksql, [id], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE arch_agency 
            SET is_done = 1, completed_date = NOW() 
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE arch_agency 
            SET is_done = 0, completed_date = null
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchmaterialstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `arch_material` WHERE `arch_id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 8 AND project_id = ?
      `;

      db.query(checksql, [id], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE arch_material 
            SET is_done = 1, completed_date = NOW() 
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE arch_material 
            SET is_done = 0, completed_date = null
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchschedulestage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM schedule 
      WHERE source_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 7 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE schedule SET is_done = 1, completed_date = NOW(), team_id = ? WHERE source_id = ? and source_type = 1`
            : `UPDATE schedule SET is_done = 0, completed_date = NULL, team_id = NULL  WHERE source_id = ? and source_type = 1`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchsiteengstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `mst_arch_site_eng` WHERE `arch_id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 10 AND project_id = ?
      `;

      db.query(checksql, [id], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE mst_arch_site_eng 
            SET is_done = 1, completed_date = NOW() 
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE mst_arch_site_eng 
            SET is_done = 0, completed_date = null
            WHERE arch_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 0  
            WHERE file_id = ?
          `;
        }

        db.query(updateScheduleSql, [id], (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          db.query(updateTodoSql, [fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },

  updatearchriskstage: function (req, res) {
    const { id, stage_completed } = req.body;
    const archId = parseInt(id);
    const stageCompleted = parseInt(stage_completed);
    const user_id = req.user ? req.user.id : null;

    if (!archId) {
      return res.status(400).json({
        error: true,
        message: "Invalid or missing 'id'",
        data: {},
      });
    }

    const selectSql = `
      SELECT id, is_done 
      FROM mst_arch_risk_matrix 
      WHERE arch_id = ?
    `;

    db.query(selectSql, [archId], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Record not found", data: {} });
      }

      const checksql = `
        SELECT id 
        FROM new_mst_file_details 
        WHERE source_type = 2 AND project_name = 8 AND project_id = ?
      `;

      db.query(checksql, [archId], (err, checkresult) => {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (checkresult.length === 0) {
          return res.status(404).json({
            error: true,
            message: "File ID not found for given arch_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE mst_arch_risk_matrix SET is_done = 1, completed_date = NOW(), team_id = ? WHERE arch_id = ?`
            : `UPDATE mst_arch_risk_matrix SET is_done = 0, completed_date = NULL, team_id = NULL  WHERE arch_id = ?`;

        const updateTodoSql = `UPDATE todos SET status = ? WHERE file_id = ?`;

        // Update
        const scheduleParams =
          stageCompleted === 1 ? [user_id, archId] : [archId];
        db.query(updateScheduleSql, scheduleParams, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          // Update todos
          db.query(updateTodoSql, [stageCompleted, fileid], (err2) => {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            return res.status(200).json({
              error: false,
              message: "Stage and task updated successfully",
              data: {},
            });
          });
        });
      });
    });
  },
};
