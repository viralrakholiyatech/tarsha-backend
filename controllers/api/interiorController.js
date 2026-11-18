const { getImageWithFoldername, unlinkSingleImage } = require("../../services/FileService");
module.exports = {
 getAllInterior: (req, res) => {
  const sql = `
  SELECT 
    nmf.id, 
    nmf.case_id, 
    nmf.project_name, 
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no, 
    nmf.authority, 
    nmf.tentative_design,
    nmf.address,
    nmf.google_location,
    mc.name AS projectType, 
    mpt.title AS category, 
    v.name AS village, 
    u.first_name as client_name,
    tp.tpscheme,
    CASE WHEN EXISTS(SELECT 1 FROM basic_details abd WHERE abd.interior_id = nmf.id AND abd.is_done = 1) THEN 'green' ELSE 'yellow' END AS basic_details_status,
    CASE WHEN EXISTS(SELECT 1 FROM space_planning asp WHERE asp.interior_id = nmf.id AND asp.is_done = 1) THEN 'green' ELSE 'yellow' END AS study_rnd_status,
    CASE WHEN EXISTS(SELECT 1 FROM space_planning asp WHERE asp.interior_id = nmf.id AND asp.is_done = 1) THEN 'green' ELSE 'yellow' END AS space_planning_status,
    CASE WHEN EXISTS(SELECT 1 FROM mst_fees am WHERE am.interior_id = nmf.id AND am.is_done = 1) THEN 'green' ELSE 'yellow' END AS quoation_status,
    CASE WHEN EXISTS(SELECT 1 FROM final_d af WHERE af.interior_id = nmf.id AND af.is_done = 1) THEN 'green' ELSE 'yellow' END AS dc_status,
    CASE WHEN EXISTS(SELECT 1 FROM threed atd WHERE atd.interior_id = nmf.id AND atd.is_done = 1) THEN 'green' ELSE 'yellow' END AS consultant_status,
    CASE WHEN EXISTS(SELECT 1 FROM technicaldrawing ad WHERE ad.interior_id = nmf.id AND ad.is_done = 1) THEN 'green' ELSE 'yellow' END AS drawing_status,
    CASE WHEN EXISTS(SELECT 1 FROM schedule s WHERE s.source_id = nmf.id AND s.source_type = 2 AND s.is_done = 1) THEN 'green' ELSE 'yellow' END AS schedule_status,
    CASE WHEN EXISTS(SELECT 1 FROM risk_matrix marm WHERE marm.interior_id = nmf.id AND marm.is_done = 1) THEN 'green' ELSE 'yellow' END AS risk_status
  FROM new_mst_file AS nmf
  JOIN new_mst_file_project_details AS nmfpd 
    ON nmfpd.project_id = nmf.id 
    AND nmfpd.is_deleted = 0 
    AND nmfpd.application_name = 'interior_design'
  LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  LEFT JOIN village AS v ON v.id = nmf.village
  LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  LEFT JOIN users AS u ON u.id = nmf.client_id
  WHERE nmf.is_deleted = 0
  GROUP BY nmf.id
  ORDER BY nmf.id DESC
`;

  db.query(sql, async function (err, results) {
    if (err) {
      return res
        .status(201)
        .json({ error: true, message: err.sqlMessage, data: {} });
    }
    if (!results || results.length === 0) {
      return res.status(201).json({
        error: true,
        message: "Requesting record not found",
        data: {},
      });
    }

    return res.status(201).json({
      error: false,
      message: "Record fetched",
      data: results,
    });
  });
},

  getInteriorMembersData: async (req, res) => {
    try {
      // Promisified db.query
      const queryAsync = (sql, params) =>
        new Promise((resolve, reject) => {
          db.query(sql, params, (err, rows) =>
            err ? reject(err) : resolve(rows),
          );
        });

      // ── Base row(s) for this id ──
      const baseSql = `SELECT id FROM new_mst_file WHERE id = ?`;
      const results = await queryAsync(baseSql, [req.params.id]);

      if (!results || results.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

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

      const enrichedResults = await Promise.all(
        results.map(async (row) => {
          const hodSql = `
          SELECT
            mad.title                                          AS stage_title,
            u.first_name                                       AS hod_name,
            u.profile_picture                                  AS hod_profile,
            GROUP_CONCAT(au.first_name     SEPARATOR ', ')     AS member_names,
            GROUP_CONCAT(au.profile_picture SEPARATOR ', ')    AS assign_profile,
            nmfd.completed_by,
            CASE
              WHEN ANY_VALUE(lt.status_at) IS NOT NULL
              THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
              ELSE DATEDIFF(nmfd.completed_by, CURDATE())
            END AS remaining_days,
            ANY_VALUE(lt.status)    AS latest_status,
            ANY_VALUE(lt.status_at) AS latest_status_at
          FROM new_mst_file_details AS nmfd
          LEFT JOIN mst_interior_details AS mad ON mad.id = nmfd.project_name
          LEFT JOIN users AS u ON u.id = nmfd.assign_to_hod
          LEFT JOIN users AS au
            ON nmfd.assign_members IS NOT NULL
            AND JSON_VALID(nmfd.assign_members)
            AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
          LEFT JOIN (
            SELECT t1.file_id, t1.status, t1.status_at
            FROM todos t1
            INNER JOIN (
              SELECT file_id, MAX(status_at) AS max_status_at
              FROM todos
              WHERE file_id IN (
                SELECT id FROM new_mst_file_details WHERE project_id = ? AND source_type = 3 AND is_deleted = 0
              )
              GROUP BY file_id
            ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
          ) AS lt ON lt.file_id = nmfd.id
          WHERE nmfd.project_id = ?
            AND nmfd.source_type = 3
            AND nmfd.is_deleted = 0
          GROUP BY nmfd.id, mad.title, u.first_name, u.profile_picture, nmfd.completed_by
        `;

          const statusSql = `
          SELECT
            CASE WHEN EXISTS(SELECT 1 FROM basic_details WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS basic_details_status,
            CASE WHEN EXISTS(SELECT 1 FROM space_planning WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS study_rnd_status,
            CASE WHEN EXISTS(SELECT 1 FROM space_planning WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS space_planning_status,
            CASE WHEN EXISTS(SELECT 1 FROM mst_fees WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS quoation_status,
            CASE WHEN EXISTS(SELECT 1 FROM final_d WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS dc_status,
            CASE WHEN EXISTS(SELECT 1 FROM threed WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS consultant_status,
            CASE WHEN EXISTS(SELECT 1 FROM technicaldrawing WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS drawing_status,
            CASE WHEN EXISTS(SELECT 1 FROM schedule WHERE source_id = ? AND source_type = 2 AND is_done = 1) THEN 'green' ELSE 'yellow' END AS schedule_status,
            CASE WHEN EXISTS(SELECT 1 FROM risk_matrix WHERE interior_id = ? AND is_done = 1) THEN 'green' ELSE 'yellow' END AS risk_status
        `;

          const [hodRows, statusRows] = await Promise.all([
            queryAsync(hodSql, [row.id, row.id]),
            queryAsync(statusSql, [row.id, row.id, row.id, row.id, row.id, row.id, row.id, row.id, row.id]),
          ]);

          const statusRow = statusRows && statusRows[0] ? statusRows[0] : {};

          if (hodRows.length > 0) {
            row.hod_name = hodRows[0].hod_name;
            row.hod_profile = hodRows[0].hod_profile;
            row.assign_profile = hodRows[0].assign_profile;

            const stageMap = new Map();
            hodRows.forEach((hr) => {
              if (hr.stage_title) {
                stageMap.set(hr.stage_title.trim(), hr);
              }
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
                status: statusRow[stage.statusKey] || null,
              };
            });

            row.member_names.sort(
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
              status: statusRow[stage.statusKey] || null,
            }));
          }

          return row;
        }),
      );

      return res.status(200).json({
        success: true,
        data: enrichedResults,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        success: false,
        message: "Error fetching HOD/assign_member data",
        data: [],
      });
    }
  },
  

  getBasicInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      nmf.address,
      nmf.google_location,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS basic_details_status,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN basic_details AS abd ON abd.interior_id = nmf.id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 1
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

    const titleOrder = {
      "Basic Details": 1,
    };

    db.query(sql, function (err, result) {
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

      // Format member_names as structured array — identical shape to getBasicArch
      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Basic Details",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getStudyInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.address,
      nmf.google_location,
      nmf.authority, 
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS space_planning_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN space_planning AS asp ON asp.interior_id = nmf.id
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 2
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

    const titleOrder = {
      "Study/RND": 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Study/RND",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getquotationInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.address,
      nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS quoation_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN mst_fees AS am ON am.interior_id = nmf.id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 3
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

    const titleOrder = {
      Quotation: 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Quotation",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getConceptInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.address,
      nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS dc_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN final_d AS af ON af.interior_id = nmf.id
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 4
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

    const titleOrder = {
      "Design Concept": 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Design Concept",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getConsultantsInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      nmf.address,
      nmf.google_location,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS consultant_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN threed AS atd ON atd.interior_id = nmf.id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 5
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

    const titleOrder = {
      Consultants: 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Consultants",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getTdInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      nmf.address,
      nmf.google_location,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS drawing_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN technicaldrawing AS ad ON ad.interior_id = nmf.id
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 6
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

    const titleOrder = {
      "Technical Drawings": 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Technical Drawings",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getScheduleInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.address,
      nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN s.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS schedule_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 2
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 7
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

    const titleOrder = {
      Schedule: 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Schedule",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getriskInterior: (req, res) => {
    var sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.address,
      nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name AS client_name,
      tp.tpscheme,
      mid.title AS landtype,
      ah.first_name AS hod_name,
      ah.profile_picture AS hod_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS risk_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at

    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
    LEFT JOIN users AS ah ON ah.id = nmfd.assign_to_hod
    LEFT JOIN users AS au 
      ON nmfd.assign_members IS NOT NULL 
      AND JSON_VALID(nmfd.assign_members)
      AND JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')
    LEFT JOIN risk_matrix AS marm ON marm.interior_id = nmf.id
    LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name

    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

    WHERE 
      nmfpd.is_deleted = 0
      AND nmfpd.application_name = 'interior_design'
      AND nmfd.source_type = 3
      AND nmfd.project_name = 8
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

    const titleOrder = {
      "Risk Matrix": 1,
    };

    db.query(sql, function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Risk Matrix",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

   getempInterior: (req, res) => {
    const userId = req.user.id;
    const sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      nmf.address,
      nmf.google_location,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
      u.first_name as client_name,
      tp.tpscheme,
      GROUP_CONCAT(DISTINCT mad.title SEPARATOR ', ') AS title, 
      CASE WHEN EXISTS(SELECT 1 FROM basic_details abd WHERE abd.interior_id = nmf.id AND abd.is_done = 1) THEN 'green' ELSE 'yellow' END AS basic_details_status,
      CASE WHEN EXISTS(SELECT 1 FROM space_planning asp WHERE asp.interior_id = nmf.id AND asp.is_done = 1) THEN 'green' ELSE 'yellow' END AS study_rnd_status,
      CASE WHEN EXISTS(SELECT 1 FROM space_planning asp WHERE asp.interior_id = nmf.id AND asp.is_done = 1) THEN 'green' ELSE 'yellow' END AS space_planning_status,
      CASE WHEN EXISTS(SELECT 1 FROM mst_fees am WHERE am.interior_id = nmf.id AND am.is_done = 1) THEN 'green' ELSE 'yellow' END AS quoation_status,
      CASE WHEN EXISTS(SELECT 1 FROM final_d af WHERE af.interior_id = nmf.id AND af.is_done = 1) THEN 'green' ELSE 'yellow' END AS dc_status,
      CASE WHEN EXISTS(SELECT 1 FROM threed atd WHERE atd.interior_id = nmf.id AND atd.is_done = 1) THEN 'green' ELSE 'yellow' END AS consultant_status,
      CASE WHEN EXISTS(SELECT 1 FROM technicaldrawing ad WHERE ad.interior_id = nmf.id AND ad.is_done = 1) THEN 'green' ELSE 'yellow' END AS drawing_status,
      CASE WHEN EXISTS(SELECT 1 FROM schedule s WHERE s.source_id = nmf.id AND s.source_type = 2 AND s.is_done = 1) THEN 'green' ELSE 'yellow' END AS schedule_status,
      CASE WHEN EXISTS(SELECT 1 FROM risk_matrix marm WHERE marm.interior_id = nmf.id AND marm.is_done = 1) THEN 'green' ELSE 'yellow' END AS risk_status 
    FROM new_mst_file AS nmf
    JOIN new_mst_file_project_details AS nmfpd 
      ON nmfpd.project_id = nmf.id 
      AND nmfpd.is_deleted = 0 
      AND nmfpd.application_name = 'interior_design'
    JOIN new_mst_file_details AS nmfd 
      ON nmfd.project_id = nmf.id 
      AND nmfd.source_type = 3 
      AND nmfd.is_deleted = 0
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN mst_interior_details AS mad ON mad.id = nmfd.project_name
    WHERE nmf.is_deleted = 0
      AND (
        FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?
      ) 
    GROUP BY 
      nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, 
      nmf.b_no, nmf.rs_no, nmf.authority, nmf.tentative_design,
      mc.name, mpt.title, v.name, u.first_name, nmf.address,
      nmf.google_location
    ORDER BY nmf.id DESC
  `;

    db.query(sql, [userId, userId], async function (err, results) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      if (!results || results.length === 0) {
        return res.status(201).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: results,
      });
    });
  },


  getempBasicInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
  ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
            GROUP_CONCAT(au.profile_picture SEPARATOR ', ') AS assign_profile,
          GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
            GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
                  GROUP_CONCAT(DISTINCT 
        CASE WHEN abd.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS basic_details_status,
        nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,
        CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN basic_details AS abd ON abd.interior_id = nmf.id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name


    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 1  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
       nmf.address,
        nmf.google_location,
        mid.title,
        ah.first_name,
           ah.profile_picture,
               nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      "Basic Details": 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      // Format member_names as array of objects — same shape as getBasicArch
      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Basic Details",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getempStudyInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
         ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
               GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
            GROUP_CONCAT(au.profile_picture SEPARATOR ', ') AS assign_profile,
            GROUP_CONCAT(DISTINCT 
        CASE WHEN asp.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS space_planning_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
            nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
           LEFT JOIN space_planning AS asp ON asp.interior_id = nmf.id
      left join mst_interior_details as mid on mid.id = nmfd.project_name

          LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 2  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
       nmf.address,
        nmf.google_location,
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
        mid.title,
  ah.first_name,
           ah.profile_picture,
            nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      "Space Planning": 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      // Format member_names as array of objects — same shape as getempBasicArch
      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Space Planning",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getempquotationInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
      ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
              GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN am.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS quoation_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

              nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name
 LEFT JOIN mst_fees AS am ON am.interior_id = nmf.id

          LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 3  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
       nmf.address,
        nmf.google_location,
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
        mid.title,
            ah.first_name,
           ah.profile_picture,
             nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      Quotation: 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Quotation",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getempConceptInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
            ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
          GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN af.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS dc_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name
          LEFT JOIN final_d AS af ON af.interior_id = nmf.id


    LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id
        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 4  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       nmf.address,
        nmf.google_location,
       u.first_name,
      tp.tpscheme,
        mid.title,
         ah.first_name,
           ah.profile_picture,
             nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      "Design Concept": 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Design Concept",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getempConsultantsInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no,
       nmf.address,
        nmf.google_location,
      nmf.authority, 
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
          ah.first_name AS hod_name,
                  ah.profile_picture as hod_profile,
     GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN atd.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS consultant_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name

 LEFT JOIN threed AS atd ON atd.interior_id = nmf.id
         LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 5  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
       nmf.address,
        nmf.google_location,
        mid.title,
          ah.first_name,
           ah.profile_picture,
                 nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      Consultants: 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Consultants",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getempTdInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
              ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
    GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN ad.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS drawing_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name
          LEFT JOIN technicaldrawing AS ad ON ad.interior_id = nmf.id

        LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 6  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
        mid.title,
       ah.first_name,
           ah.profile_picture,
              nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      "Technical Drawing": 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Technical Drawing",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },
  getempScheduleInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
       nmf.address,
        nmf.google_location,
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
    ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
           GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,
      GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT 
        CASE 
          WHEN s.is_done = 1 THEN 'green'
          ELSE 'yellow'
        END 
        SEPARATOR ','
      ) AS schedule_status,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name
  LEFT JOIN schedule AS s ON s.source_id = nmf.id AND s.source_type = 2

          LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 7  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
       nmf.address,
        nmf.google_location,
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
        mid.title,
          ah.first_name,
           ah.profile_picture,
             nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      Schedule: 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Schedule",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  getempriskmatrixInterior: (req, res) => {
    const userId = req.user.id;
    var sql = `
          SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
       nmf.address,
        nmf.google_location,
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name AS projectType, 
      mpt.title AS category, 
      v.name AS village, 
       u.first_name as client_name,
      tp.tpscheme,
        mid.title as landtype,
  ah.first_name as hod_name,
              ah.profile_picture as hod_profile,
     GROUP_CONCAT(DISTINCT mid.title SEPARATOR ', ') AS title,
      GROUP_CONCAT(DISTINCT au.profile_picture SEPARATOR ', ') AS assign_profile,
      GROUP_CONCAT(DISTINCT 
        CASE WHEN marm.is_done = 1 THEN 'green' ELSE 'yellow' END 
        SEPARATOR ','
      ) AS risk_status,
      GROUP_CONCAT(DISTINCT au.first_name ORDER BY au.first_name SEPARATOR ', ') AS member_names,

      nmfd.completed_by,
      nmfd.assign_on,
      nmfd.days,

      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN NULL
        WHEN latest.latest_status_at IS NOT NULL 
          THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
      END AS remaining_days,

      latest.latest_status,
      latest.latest_status_at
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN 
      outward_details AS od ON od.approval_id = nmf.id
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join new_mst_file_details as nmfd on nmfd.project_id = nmf.id
      left join users as ah on ah.id = nmfd.assign_to_hod
          LEFT JOIN users AS au ON JSON_CONTAINS(nmfd.assign_members, CAST(au.id AS JSON), '$')  
      left join mst_interior_details as mid on mid.id = nmfd.project_name
  LEFT JOIN risk_matrix AS marm ON marm.interior_id = nmf.id

         LEFT JOIN (
      SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
      FROM todos t1
      INNER JOIN (
        SELECT file_id, MAX(status_at) AS max_status_at
        FROM todos
        GROUP BY file_id
      ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest ON latest.file_id = nmfd.id

        WHERE 
        nmfpd.is_deleted = 0   and nmfpd.application_name = "interior_design"  and nmfd.project_name = 8  and  nmfd.source_type =3 and nmfd.is_deleted = 0
         and
         (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) 
        GROUP BY 
             nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
       nmf.address,
        nmf.google_location,
      nmf.rs_no, 
      nmf.authority, 
      nmf.tentative_design,
      mc.name, 
      mpt.title, 
      v.name, 
       u.first_name,
      tp.tpscheme,
        mid.title,
 ah.first_name,
           ah.profile_picture,
              nmfd.completed_by, nmfd.assign_on, nmfd.days,
      latest.latest_status, latest.latest_status_at
         `;

    const titleOrder = {
      "Risk Matrix": 1,
    };

    db.query(sql, [userId, userId], function (err, result) {
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

      const formattedResult = result.map((row) => ({
        ...row,
        member_names: [
          {
            member_names: row.member_names,
            title: row.title || "Risk Matrix",
            hod: row.hod_name,
            days: row.remaining_days,
            todo_status: row.latest_status || null,
            todo_date: row.latest_status_at || null,
          },
        ].sort(
          (a, b) => (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999),
        ),
      }));

      return res.status(201).json({
        error: false,
        message: "Record fetched",
        data: formattedResult,
      });
    });
  },

  deleteInterior: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

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
          WHERE application_name = "interior_design" AND project_id = ?
        `;
      const checksql = `SELECT id FROM new_mst_file_details WHERE project_id = ?`;
      const sql2 = `
          UPDATE todos 
          SET is_deleted = 1 
          WHERE file_id = ?
        `;

      const schedulesql = `SELECT id FROM schedule WHERE source_type = 2 AND source_id = ?`;

      const sql3 = `
        UPDATE todos 
        SET is_deleted = 1 
        WHERE schedule_id = ?
      `;

      // First update
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

  // basic details
  addoreditinterior: async (req, res) => {
    const user_id = req.user.id;
    const this_data = req.body;

    const details = {
      interior_id: this_data.editid,
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
      const getExistingQuery = `SELECT * FROM basic_details WHERE interior_id = ?`;

      db.query(getExistingQuery, [this_data.editid], function (err, results) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (results.length > 0) {
          const updateQuery = `UPDATE basic_details SET ? WHERE interior_id = ?`;

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

              // Insert or update mst_question_answer
              if (this_data.questions && Array.isArray(this_data.questions)) {
                this_data.questions.forEach((question) => {
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
                          question.answer !== undefined &&
                          question.answer !== ""
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
                        // Insert new record
                        const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type,title, answer, created_at, created_by,is_deleted) VALUES (?,?, ?, ?,?, ?, ?,?)`;
                        db.query(
                          insertQuery,
                          [
                            this_data.editid,
                            question.id,
                            2,
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
              }

              return res.status(200).json({
                error: false,
                message: "Basic details have been updated successfully.",
                data: { interior_id: this_data.editid },
              });
            },
          );
        } else {
          details.created_at = getCurrentDateAndTime();
          details.created_by = user_id;
          details.updated_at = null;
          details.updated_by = null;

          db.query(
            "INSERT INTO basic_details SET ?",
            details,
            function (err, result) {
              if (err) {
                return res
                  .status(500)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              }

              const insertedId = result.insertId;

              // Insert mst_question_answer
              if (this_data.questions && Array.isArray(this_data.questions)) {
                this_data.questions.forEach((question) => {
                  const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type,title, answer, created_at, created_by,is_deleted) VALUES (?,?,?, ?, ?, ?, ?,?)`;
                  db.query(
                    insertQuery,
                    [
                      this_data.editid,
                      question.id,
                      2,
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
              }

              return res.status(201).json({
                error: false,
                message: "Basic details have been added successfully.",
                data: { interior_id: insertedId },
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
        "INSERT INTO basic_details SET ?",
        details,
        function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          const insertedId = result.insertId;

          // Insert mst_question_answer
          if (this_data.questions && Array.isArray(this_data.questions)) {
            this_data.questions.forEach((question) => {
              const insertQuery = `INSERT INTO mst_question_answer (source_id, question_id,type, answer, created_at, created_by) VALUES (?,?, ?, ?, ?, ?)`;
              db.query(
                insertQuery,
                [
                  insertedId,
                  question.question_id,
                  2,
                  question.answer,
                  getCurrentDateAndTime(),
                  user_id,
                ],
                (err) => {
                  if (err) console.error("Error inserting question:", err);
                },
              );
            });
          }

          return res.status(201).json({
            error: false,
            message: "Basic details have been added successfully.",
            data: { interior_id: insertedId },
          });
        },
      );
    }
  },

  fetchbasicdetailsbyid: (req, res) => {
    const id = req.params.id;
    var sql = `
          select  
          bd.id, bd.project_detail, bd.requirement,bd.scopework,bd.is_done,
          bd.is_done,
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
          left join basic_details as bd
          on bd.interior_id = nmf.id
          LEFT JOIN users AS u ON u.id = nmf.client_id
          left join village as v on v.id = nmf.village
          left join tpscheme as tp on tp.id = nmf.tpscheme
          left join mst_project_type as mpt on mpt.id = nmf.category
          left join mst_category as mc on mc.id = nmf.project_type
          WHERE nmf.id = ?;
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

  // stduy
  fetchinteriorrndyid: (req, res) => {
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
      FROM interior_study_rnd AS sr
      LEFT JOIN interior_rnd_site_images AS rsi ON rsi.interior_id = sr.interior_id
      WHERE sr.is_deleted = 0 AND sr.interior_id = ?
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

  upsertinteriorRnd: async (req, res) => {
    try {
      const user_id = req.user.id;
      const this_data = req.body;

      const files = req.files || [];
      const reportFile = files.find((file) => file.fieldname === "report");
      const report = this_data.report || (reportFile ? getImageWithFoldername(reportFile.path) : "");

      let bodySiteImages = this_data.site_images || this_data.site_image || [];
      if (typeof bodySiteImages === "string") {
        try {
          bodySiteImages = JSON.parse(bodySiteImages);
        } catch (e) {
          bodySiteImages = bodySiteImages.includes(",")
            ? bodySiteImages.split(",").map((s) => s.trim())
            : [bodySiteImages];
        }
      }
      if (!Array.isArray(bodySiteImages)) bodySiteImages = [bodySiteImages];
      bodySiteImages = bodySiteImages.filter(Boolean);

      const fileSiteImages = files
        .filter((file) => file.fieldname === "site_image")
        .map((img) => getImageWithFoldername(img.path));

      const allSiteImages = [...bodySiteImages, ...fileSiteImages];

      const baseDetails = {
        interior_id: this_data.editid || null,
        keyobservation: this_data.keyobservation || "",
        remarks: this_data.remarks || "",
        summary: this_data.summary || "",
        site_incharge: this_data.site_incharge || "",
        authorized_person: this_data.authorized_person || "",
        report,
        is_deleted: 0,
      };

      const insertSiteImages = (interior_id, images) => {
        const values = images.map((img) => [
          interior_id,
          typeof img === "string"
            ? img
            : img.path
            ? getImageWithFoldername(img.path)
            : img,
        ]);
        if (values.length === 0) return;

        const query =
          "INSERT INTO interior_rnd_site_images (interior_id, images) VALUES ?";
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
          "INSERT INTO interior_study_rnd SET ?",
          insertDetails,
          (err, result) => {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }
            const newId = result.insertId;
            insertSiteImages(this_data.editid || newId, allSiteImages);

            return res.status(201).json({
              error: false,
              message: "Rnd has been added successfully.",
              data: { interior_id: newId },
            });
          },
        );
      };

      if (this_data.editid) {
        db.query(
          "SELECT * FROM interior_study_rnd WHERE interior_id = ?",
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
                "UPDATE interior_study_rnd SET ? WHERE interior_id = ?",
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

                  if (allSiteImages.length > 0) {
                    // Delete old and insert new only if new site images are uploaded
                    db.query(
                      "DELETE FROM interior_rnd_site_images WHERE interior_id = ?",
                      [this_data.editid],
                      (err) => {
                        if (err) {
                          console.error(
                            "Failed to delete existing site images:",
                            err.sqlMessage,
                          );
                        }

                        insertSiteImages(this_data.editid, allSiteImages);

                        return res.status(200).json({
                          error: false,
                          message:
                            "Rnd has been updated successfully with new site images.",
                          data: { interior_id: this_data.editid },
                        });
                      },
                    );
                  } else {
                    // Keep old images if no new site images are uploaded
                    return res.status(200).json({
                      error: false,
                      message:
                        "Rnd has been updated successfully (existing images retained).",
                      data: { interior_id: this_data.editid },
                    });
                  }
                },
              );
            } else {
              insertData(); // Record not found, insert as new
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

  // space planning

  addSpacePlanningcategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_space_planning SET ?",
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

  getSpacePlannigbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
    msp.id,
    COALESCE(msp.name, 'No Name') AS name,
    sp.id AS spid,
    u.profile_picture,
    ru.profile_picture AS review_profile,
    sp.category_id,
    sp.internalstatus,
    sp.internalremark,
    sp.materialphoto,
     DATE_FORMAT(sp.created_at, '%d %b %Y') as Date,
    sp.notes,
    sp.clientstatus,
    sp.clientremark,
    sp.team_id,
    sp.is_done
FROM mst_space_planning AS msp
LEFT JOIN space_planning AS sp ON sp.category_id = msp.id AND sp.is_deleted = 0
LEFT JOIN users AS u ON u.id = sp.created_by 
LEFT JOIN users AS ru ON ru.id = sp.review_by 
WHERE msp.is_deleted = 0 
AND msp.interior_id = ?
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
  getSpcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_space_planning where id = ? and is_deleted = 0
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

  updatespCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const selectSql = "SELECT * FROM `mst_space_planning` WHERE `id` = ?";

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
        "UPDATE `mst_space_planning` SET " +
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

  AddSpacePlanning: function (req, res) {
    const files = [];
    let materialphoto = req.body.materialphoto || req.body.design_file || req.body.designfile || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "materialphoto" || file.fieldname === "design_file" || file.fieldname === "designfile") {
        materialphoto = getImageWithFoldername(file.path);
        files.push(materialphoto);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      interior_id: this_data.interior_id,
      category_id: this_data.editId,
      internalstatus: 0,
      materialphoto: materialphoto,
      clientstatus: 0,
      notes: this_data.notes,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO space_planning SET ?",
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

  deleteSpacePlannig: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `space_planning` SET `is_deleted`=1,`updated_by`=" +
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

  internalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from space_planning WHERE is_deleted = 0 and  id=" +
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
  updateInternalStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);
    const selectSql = "SELECT * FROM `space_planning` WHERE `id` = ?";

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
        "UPDATE `space_planning` SET " +
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

  updateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `space_planning` WHERE `id` = ?";

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
        "UPDATE `space_planning` SET " +
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

  ClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from space_planning WHERE is_deleted = 0 and  id=" +
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

  updatespstage: function (req, res) {
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
     SELECT  id,is_done FROM space_planning WHERE interior_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE space_planning SET is_done = 1, completed_date = NOW(), team_id = ? WHERE interior_id = ?`
            : `UPDATE space_planning SET is_done = 0, completed_date = NULL, team_id = NULL WHERE interior_id = ?`;

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

  // fees

  addFees: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const fees = {
      price: this_data.price,
      interior_id: this_data.Id,
      status: this_data.status || 0,
      remark: this_data.remark,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_fees SET ?", fees, function (err, result) {
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

  getFees: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status,is_done from mst_fees where is_deleted = 0 and interior_id = ?;
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

  deleteFees: function (req, res) {
    const feesId = req.params.id;
    const id = req.user.id;

    var sql =
      "UPDATE `mst_fees` SET `is_deleted`=1,`updated_by`=" +
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

  fetchFeesbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status from mst_fees where is_deleted = 0 and id = ?;
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

  updateFees: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_fees` WHERE `id` = ?";

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
        "UPDATE `mst_fees` SET " +
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

  // vendors

  addVendors: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      vendors: this_data.vendor_id,
      interior_id: this_data.interior_id,
      category_id: this_data.editId,
      price: this_data.price,
      remark: this_data.remark,
      status: 0,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO quotation SET ?", category, function (err, result) {
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

  deleteVendor: function (req, res) {
    const vendorId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `quotation` SET `is_deleted`=1,`updated_by`=" +
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

  fetchVendorbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,vendors,price,status,remark  from quotation where is_deleted = 0 and id = ?;
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

  addQuationcategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_quation SET ?", category, function (err, result) {
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

  getQuationbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
    mq.id AS mst_id,
    mq.name,
    COALESCE(q.id) AS qid,
    COALESCE(v.name, '') AS vendors, 
    COALESCE(v.mobile, '') AS mobile_no, 
    COALESCE(q.price) AS price,
    COALESCE(q.remark) AS remark,
    COALESCE(q.status) AS status
FROM mst_quation AS mq
LEFT JOIN quotation AS q ON q.category_id = mq.id AND q.is_deleted = 0
left join vendors as v on v.id = q.vendors
WHERE mq.is_deleted = 0 
AND mq.interior_id = ?;
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

  updateQuotation: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `quotation` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const quation = {
        vendors: this_data.vendor_id,
        price: this_data.price,
        status: this_data.status,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `quotation` SET " +
        "`vendors` = ?, " +
        "`price` = ?, " +
        "`status` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          quation.vendors,
          quation.price,
          quation.status,
          quation.updated_at,
          parseInt(quation.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "Quotation has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  getQotcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_quation where id = ? and is_deleted = 0
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

  updateQuotationCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_quation` WHERE `id` = ?";

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
        "UPDATE `mst_quation` SET " +
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
            message: "Quotation category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  // contractor

  addinteriorContractorCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_interior_contractor SET ?",
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

  getInteriorContractorcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,name from mst_interior_contractor where id = ? and is_deleted = 0
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

  updateinteriorContractorCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_interior_contractor` WHERE `id` = ?";

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
        "UPDATE `mst_interior_contractor` SET " +
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
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Contractor category has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  deleteinteriorContractor: function (req, res) {
    const vendorId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `interior_contractor` SET `is_deleted`=1,`updated_by`=" +
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

  getinteriorContractorbyid: (req, res) => {
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
FROM mst_interior_contractor AS mac
LEFT JOIN interior_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
left join vendors as v on v.id = ac.vendors
WHERE mac.is_deleted = 0 
AND mac.interior_id = ?;
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

  addinteriorContractor: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      vendors: this_data.vendor_id,
      interior_id: this_data.interior_id,
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
      "INSERT INTO interior_contractor SET ?",
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

  fetchinteriorContractorbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,vendors,price,status,remark  from interior_contractor where is_deleted = 0 and id = ?;
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

  updateinteiorContractor: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `interior_contractor` WHERE `id` = ?";

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
        "UPDATE `interior_contractor` SET " +
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
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Contractor has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  // material

  addMaterialCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_material SET ?",
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
  materialcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
          mm.id AS mm_id,
          mm.title,
          COALESCE(m.id) AS mid,
          COALESCE(v.name, '') AS vendors, 
          COALESCE(v.mobile, '') AS phone, 
          COALESCE(m.material_photo, '') AS material_photo,
          COALESCE(m.material_name, '') AS material_name,
          COALESCE(m.rate, '') AS rate,
          COALESCE(m.remark, '') AS remark,
          COALESCE(m.status, '') AS status,
          m.is_done
          FROM mst_material AS mm
          LEFT JOIN material AS m ON m.category_id = mm.id AND m.is_deleted = 0
          left join vendors as v on v.id = m.vendor
          WHERE mm.is_deleted = 0 
          AND mm.interior_id = ?`;
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

  materialbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `select * from material where id = ?`;
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

  AddMaterial: function (req, res) {
    const files = [];
    let materialphoto = req.body.materialphoto || req.body.material_photo || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "materialphoto" || file.fieldname === "material_photo") {
        materialphoto = getImageWithFoldername(file.path);
        files.push(materialphoto);
      } else {
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      // interior_id: this_data.interior_id,
      category_id: this_data.editId,
      interior_id: this_data.id,
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

    db.query("INSERT INTO material SET ?", planning, function (err, result) {
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
    });
  },

  materialupdate: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `material` WHERE `id` = ?";

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
        "UPDATE `material` SET " +
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
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "material has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  deletematerial: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `material` SET `is_deleted`=1,`updated_by`=" +
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
          message: "Material has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  // design concept

  addConceptCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_concept SET ?", category, function (err, result) {
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

  conceptcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
        mc.id AS mc_id,
        mc.title,
        COALESCE(c.id, 0) AS cid,
        COALESCE(c.design_photo, '') AS design_photo,
        COALESCE(c.category_id, '') AS category_id,
         u.profile_picture,
        ru.profile_picture AS review_profile,
        COALESCE(c.remark, '') AS remark,
          COALESCE(DATE_FORMAT(c.created_at, '%d %b %Y'), '') AS date,
        COALESCE(c.internalstatus, '') AS internalstatus,
        COALESCE(c.internalremark, '') AS internalremark,
        COALESCE(c.clientstatus, '') AS clientstatus,
        COALESCE(c.clientremark, '') AS clientremark
        FROM mst_concept AS mc
        LEFT JOIN concept AS c ON c.category_id = mc.id AND c.is_deleted = 0
        LEFT JOIN users AS u ON u.id = c.created_by 
        LEFT JOIN users AS ru ON ru.id = c.review_by 
        WHERE mc.is_deleted = 0 
        AND mc.interior_id = ?`;
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

  deleteConcept: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `concept` SET `is_deleted`=1,`updated_by`=" +
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
          message: "Concept has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  AddConcept: function (req, res) {
    const files = [];
    let designphoto = req.body.designphoto || req.body.design_photo || req.body.designfile || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "designphoto") {
        designphoto = getImageWithFoldername(file.path);
        files.push(designphoto);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const concept = {
      category_id: this_data.editId,
      interior_id: this_data.id,
      design_photo: designphoto,
      remark: this_data.notes,
      internalstatus: 0,
      clientstatus: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO concept SET ?", concept, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Concept has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  conceptbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `select id,title from mst_concept where id = ?`;
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

  updateConcept: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_concept` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data);
      }

      const user_id = req?.user?.id;

      const concpet = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_concept` SET " +
        "`title` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [concpet.title, concpet.updated_at, parseInt(concpet.updated_by), id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          const response = {
            error: false,
            message: "Concept has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },
  getConceptcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,title from mst_concept where id = ? and is_deleted = 0
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

  updateConceptCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_concept` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_concept` SET " +
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
            message: "Concpet category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  interiordcinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from concept WHERE is_deleted = 0 and  id=" +
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

  updateinteriordcintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `concept` WHERE `id` = ?";

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
        "UPDATE `concept` SET " +
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

  interiorDcClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from concept WHERE is_deleted = 0 and  id=" +
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

  interiordcupdateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `concept` WHERE `id` = ?";

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
        "UPDATE `concept` SET " +
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
  Addfinald: function (req, res) {
    const files = [];
    let upload = req.body.upload || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      interior_id: this_data.interior_id,
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

    db.query("INSERT INTO final_d SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: " Final d has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  fetchFinaldbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select afd.id,afd.upload,afd.type,afd.status,afd.statusremark, COALESCE(DATE_FORMAT(afd.created_at, '%d %b %Y'), '') AS date,afd.remark,afd.is_done,u.profile_picture
        from final_d as afd
        left join users as u
        on u.id = afd.created_by
        where afd.is_deleted = 0 and afd.interior_id =?;
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

  deletefinald: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `final_d` SET `is_deleted`=1,`updated_by`=" +
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

  updatefinaldstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `final_d` WHERE `id` = ?";

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
        "UPDATE `final_d` SET " +
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

  finaldstatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,status,statusremark from final_d WHERE is_deleted = 0 and  id=" +
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
  updateconceptstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `final_d` WHERE `interior_id` = ?";

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
          WHERE source_type = 3 AND project_name = 4 AND project_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
              UPDATE final_d 
              SET is_done = 1, completed_date = NOW() 
              WHERE interior_id = ?
            `;
          updateTodoSql = `
              UPDATE todos 
              SET status = 1  
              WHERE file_id = ?
            `;
        } else {
          updateScheduleSql = `
              UPDATE final_d 
              SET is_done = 0, completed_date = null
              WHERE interior_id = ?
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

  // 3d

  addThreeDCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_threed SET ?", category, function (err, result) {
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

  get3dbyid: (req, res) => {
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
  u.profile_picture,
  ru.profile_picture AS review_profile,
  COALESCE(DATE_FORMAT(td.created_at, '%d %b %Y'), '') AS date,
  td.category_id,
  td.is_done,
    td.internalstatus,
  td.internalremark,
  td.clientstatus,
  td.clientremark
FROM mst_threed AS mt
LEFT JOIN threed AS td ON td.category_id = mt.id AND td.is_deleted = 0
LEFT JOIN users AS u ON u.id = td.created_by 
LEFT JOIN users AS ru ON ru.id = td.review_by 
WHERE mt.is_deleted = 0 
AND mt.interior_id = ?
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

  AddThreeD: function (req, res) {
    const files = [];
    let designphoto = req.body.designphoto || req.body.design_photo || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "designphoto") {
        designphoto = getImageWithFoldername(file.path);
        files.push(designphoto);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const technical = {
      category_id: this_data.editId,
      interior_id: this_data.id,
      vendor: this_data.vendor,
      phone: this_data.phone || null,
      notes: this_data.notes,
      designphoto: designphoto,
      clientstatus: 0,
      internalstatus: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO threed SET ?", technical, function (err, result) {
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
    });
  },

  deleteThreed: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `threed` SET `is_deleted`=1,`updated_by`=" +
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

  update3DClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);
    const selectSql = "SELECT * FROM `threed` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus || 0,
        clientremark: this_data.clientremark,
      };

      const updateSql =
        "UPDATE `threed` SET " +
        "`clientstatus` = ?, " +
        "`clientremark` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [Site.clientstatus, Site.clientremark, id],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
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

  threeDClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from threed WHERE is_deleted = 0 and  id=" +
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

  get3dcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,title from mst_threed where id = ? and is_deleted = 0
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

  update3dCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql = "SELECT * FROM `mst_threed` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_threed` SET " +
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
            message: "TD category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  get3dinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from threed WHERE is_deleted = 0 and  id=" +
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

  update3dintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `threed` WHERE `id` = ?";

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
        "UPDATE `threed` SET " +
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

  update3dstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `threed` WHERE `interior_id` = ?";

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
      WHERE source_type = 3 AND project_name = 8 AND project_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
          UPDATE threed 
          SET is_done = 1, completed_date = NOW() 
          WHERE interior_id = ?
        `;
          updateTodoSql = `
          UPDATE todos 
          SET status = 1  
          WHERE file_id = ?
        `;
        } else {
          updateScheduleSql = `
          UPDATE threed 
          SET is_done = 0, completed_date = null
          WHERE interior_id = ?
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

  // structure

  addmststructure: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_structure SET ?",
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

  structuebyid: (req, res) => {
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
  FROM mst_structure AS mas
  LEFT JOIN structure AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.interior_id = ?`;

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

  Addstructure: function (req, res) {
    const files = [];
    let zed_upload = req.body.zed_upload || "";
    let agency_upload = req.body.agency_upload || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "zed_upload") {
        zed_upload = getImageWithFoldername(file.path);
        files.push(zed_upload);
      } else if (file.fieldname === "agency_upload") {
        agency_upload = getImageWithFoldername(file.path);
        files.push(agency_upload);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      category_id: this_data.editId,
      interior_id: this_data.ID,
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

    db.query("INSERT INTO structure SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: " Structure has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  deleteStructure: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `structure` SET `is_deleted`=1,`updated_by`=" +
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

  updatestructureClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `structure` WHERE `id` = ?";

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
        "UPDATE `structure` SET " +
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

  structureClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from structure WHERE is_deleted = 0 and  id=" +
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

  structureinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from structure WHERE is_deleted = 0 and  id=" +
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

  updatestructureintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `structure` WHERE `id` = ?";

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
        "UPDATE `structure` SET " +
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

  addmstMepf: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      name: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO mst_mepf SET ?", category, function (err, result) {
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

  mepfbyid: (req, res) => {
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
    FROM mst_mepf AS mas
    LEFT JOIN mepf AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
    LEFT JOIN users AS u ON u.id = ars.created_by 
    WHERE mas.is_deleted = 0 
    AND mas.interior_id = ?`;

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

  Addmepf: function (req, res) {
    const files = [];
    let zed_upload = req.body.zed_upload || "";
    let agency_upload = req.body.agency_upload || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "zed_upload") {
        zed_upload = getImageWithFoldername(file.path);
        files.push(zed_upload);
      } else if (file.fieldname === "agency_upload") {
        agency_upload = getImageWithFoldername(file.path);
        files.push(agency_upload);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      category_id: this_data.editId,
      interior_id: this_data.ID,
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

    db.query("INSERT INTO mepf SET ?", planning, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Mepf has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  deleteMepf: function (req, res) {
    const siteId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `mepf` SET `is_deleted`=1,`updated_by`=" +
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

  updatemepfClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `mepf` WHERE `id` = ?";

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
        "UPDATE `mepf` SET " +
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

  mepfClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from mepf WHERE is_deleted = 0 and  id=" +
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

  mepfinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from mepf WHERE is_deleted = 0 and  id=" +
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

  updatemepfintenalstatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    const selectSql = "SELECT * FROM `mepf` WHERE `id` = ?";

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
        "UPDATE `mepf` SET " +
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

  // technical drawing

  addTechnicalCategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const category = {
      title: this_data.title,
      interior_id: this_data.editId,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO mst_technical_drawing SET ?",
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

  getTechnicalCategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
  mtd.id,
  COALESCE(mtd.title, 'No Name') AS name,
  td.id AS tdid,
  u.profile_picture,
  ru.profile_picture AS review_profile,
  td.category_id,
  td.internalstatus,
      COALESCE(DATE_FORMAT(td.created_at, '%d %b %Y'), '') AS date,
  td.internalremark,
  td.designphoto,
  td.clientstatus,
  td.notes,
  td.clientremark,
  td.is_done
FROM mst_technical_drawing AS mtd
LEFT JOIN technicaldrawing AS td ON td.category_id = mtd.id AND td.is_deleted = 0
LEFT JOIN users AS u ON u.id = td.created_by 
LEFT JOIN users AS ru ON ru.id = td.review_by 
WHERE mtd.is_deleted = 0 
AND mtd.interior_id = ?
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

  AddTechnical: function (req, res) {
    const files = [];
    let designphoto = req.body.designphoto || req.body.design || req.body.design_photo || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "designphoto") {
        designphoto = getImageWithFoldername(file.path);
        files.push(designphoto);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const technical = {
      category_id: this_data.editId,
      interior_id: this_data.interior_id,
      internalstatus: 0,
      notes: this_data.notes,
      designphoto: designphoto,
      clientstatus: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO technicaldrawing SET ?",
      technical,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Technical Drawing has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  deleteTechnical: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `technicaldrawing` SET `is_deleted`=1,`updated_by`=" +
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
          message: "technical drawing has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updateTDInternalStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `technicaldrawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        internalstatus: this_data.internalstatus || 0,
        internalremark: this_data.internalremark,
        review_by: user_id,
      };

      const updateSql =
        "UPDATE `technicaldrawing` SET " +
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

  updateTDClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);
    const selectSql = "SELECT * FROM `technicaldrawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const Site = {
        clientstatus: this_data.clientstatus || 0,
        clientremark: this_data.clientremark,
        client_review_by: user_id,
      };

      const updateSql =
        "UPDATE `technicaldrawing` SET " +
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

  TDinternalStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,internalstatus,internalremark from technicaldrawing WHERE is_deleted = 0 and  id=" +
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
  TDClientStatusbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,clientstatus,clientremark from technicaldrawing WHERE is_deleted = 0 and  id=" +
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
  getTdcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,title from mst_technical_drawing where id = ? and is_deleted = 0
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

  updateTdCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `mst_technical_drawing` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_technical_drawing` SET " +
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
            message: "TD category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  updatetdstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `technicaldrawing` WHERE `interior_id` = ?";

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
      WHERE source_type = 3 AND project_name = 6 AND project_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
          UPDATE technicaldrawing 
          SET is_done = 1, completed_date = NOW() 
          WHERE interior_id = ?
        `;
          updateTodoSql = `
          UPDATE todos 
          SET status = 1  
          WHERE file_id = ?
        `;
        } else {
          updateScheduleSql = `
          UPDATE technicaldrawing 
          SET is_done = 0, completed_date = null
          WHERE interior_id = ?
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

  // schedule
  addSchedule: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const schedule = {
      source_id: this_data.editId,
      source_type: 2,
      fromdate: this_data.fromdate,
      todate: this_data.todate,
      type: this_data.type,
      status: 0,
      team_member: JSON.stringify(this_data.team_member),
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

  getschedule: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select 
     s.id,
    s.source_id,
    s.is_done,
    s.type,
    s.agency,
    s.remark,
    s.status,
     DATE_FORMAT(s.fromdate, '%d-%m-%Y') AS fromdate,
  DATE_FORMAT(s.todate, '%d-%m-%Y') AS todate,
  GROUP_CONCAT(u.first_name) AS first_name
  from schedule as s
  left join   users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
  where s.is_deleted = 0 and s.source_type = 2 and s.source_id = ?
  GROUP BY 
   s.id,
    s.source_id,
    s.type,
    s.agency,
    s.remark
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

  deleteSchedule: function (req, res) {
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

  updateschedulestage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `schedule` WHERE `source_id` = ?";

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
      WHERE source_type = 3 AND project_name = 7 AND project_id = ?
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
          UPDATE schedule 
          SET is_done = 1, completed_date = NOW() 
          WHERE source_id = ? and source_type = 2
        `;
          updateTodoSql = `
          UPDATE todos 
          SET status = 1  
          WHERE file_id = ?
        `;
        } else {
          updateScheduleSql = `
          UPDATE schedule 
          SET is_done = 0, completed_date = null
          WHERE source_id = ? and source_type = 2
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

  // risk matrix

  fetchriskbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select marm.id,marm.upload,marm.remark,marm.agency,u.profile_picture,marm.is_done,
           COALESCE(DATE_FORMAT(marm.date, '%d %b %Y %I:%i %p'), '') AS date
      from risk_matrix as marm
      left join users as u
      on u.id = marm.created_by
      where marm.is_deleted = 0 and marm.interior_id =?;
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

  deleterisk: function (req, res) {
    const feesId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `risk_matrix` SET `is_deleted`=1,`updated_by`=" +
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

  Addrisk: function (req, res) {
    const files = [];
    let upload = req.body.upload || "";

    (req.files || []).forEach((file) => {
      if (file.fieldname === "upload") {
        upload = getImageWithFoldername(file.path);
        files.push(upload);
      } else {
        // Unlink unnecessary files
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const planning = {
      interior_id: this_data.interior_id,
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

    db.query("INSERT INTO risk_matrix SET ?", planning, function (err, result) {
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
    });
  },
  updateriskstage: function (req, res) {
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
    FROM risk_matrix 
    WHERE interior_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;

        const updateScheduleSql =
          stageCompleted === 1
            ? `UPDATE risk_matrix SET is_done = 1, completed_date = NOW(), team_id = ? WHERE interior_id = ?`
            : `UPDATE risk_matrix SET is_done = 0, completed_date = NULL, team_id = NULL  WHERE interior_id = ?`;

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

  questionbyid: (req, res) => {
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
               LEFT JOIN mst_project_type_category AS mptc ON mptc.project_type_id = nmf.category and  mptc.source_type = 2
               LEFT JOIN mst_category_type_question AS mctq ON mctq.category_id = mptc.id  and mctq.type = 2
               left join mst_question_answer as mqa on mqa.question_id = mctq.id and mqa.type = 2
               WHERE nmf.id =? `;

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

  getInteriorDetails: async function (req, res) {
    var sql = "select * from mst_interior_details where is_deleted = 0";

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

  getInteriorData: (req, res) => {
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
      hu.first_name AS hod_name,
    hu.profile_picture AS hod_pictures,
       GROUP_CONCAT(u.first_name) AS assign_name,
    GROUP_CONCAT(u.profile_picture) AS assign_picture
FROM 
    new_mst_file_details AS nmfd
LEFT JOIN 
    new_mst_file AS nmf ON nmf.id = nmfd.project_id
LEFT JOIN 
    mst_interior_details AS mid ON mid.id = nmfd.project_name
LEFT JOIN 
    users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users as au on au.id = nmf.client_id
LEFT JOIN 
    users AS hu ON hu.id = nmfd.assign_to_hod
WHERE 
    nmf.id = ? and nmfd.source_type = 3
GROUP BY 
    nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
    nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture,hu.first_name
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

  getMaterialcategorybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,title from mst_material where id = ? and is_deleted = 0
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

  updateMaterialCategory: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const selectSql = "SELECT * FROM `mst_material` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const fees = {
        title: this_data.title,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `mst_material` SET " +
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
            message: "Material category has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  updatescheduleStatus: function (req, res) {
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

  schedulestatusbyid: (req, res) => {
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

  updatebdstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT interior_id, is_done FROM `basic_details` WHERE `id` = ?";

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

      const interior_id = result[0].interior_id;

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 3 AND project_name = 1 AND project_id = ?
      `;

      db.query(checksql, [interior_id], (err, checkresult) => {
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
            UPDATE basic_details 
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
            UPDATE basic_details 
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

  updatestudystage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT interior_id,is_done FROM `mst_study` WHERE `id` = ?";

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

      const interior_id = result[0].interior_id;

      const checksql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 3 AND project_name = 2 AND project_id = ?
      `;

      db.query(checksql, [interior_id], (err, checkresult) => {
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
            UPDATE mst_study 
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
            UPDATE mst_study 
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

  updatequotationstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `mst_fees` WHERE `interior_id` = ?";

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
        WHERE source_type = 3 AND project_name = 4 AND project_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE mst_fees 
            SET is_done = 1, completed_date = NOW() 
            WHERE interior_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE mst_fees 
            SET is_done = 0, completed_date = null
            WHERE interior_id = ?
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

  updatematerialstage: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const selectSql =
      "SELECT  id,is_done FROM `material` WHERE `interior_id` = ?";

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
        WHERE source_type = 3 AND project_name = 5 AND project_id = ?
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
            message: "File ID not found for given interior_id",
            data: {},
          });
        }

        const fileid = checkresult[0].id;
        const stageCompleted = parseInt(this_data.stage_completed);

        let updateScheduleSql, updateTodoSql;

        if (stageCompleted === 1) {
          updateScheduleSql = `
            UPDATE material 
            SET is_done = 1, completed_date = NOW() 
            WHERE interior_id = ?
          `;
          updateTodoSql = `
            UPDATE todos 
            SET status = 1  
            WHERE file_id = ?
          `;
        } else {
          updateScheduleSql = `
            UPDATE material 
            SET is_done = 0, completed_date = null
            WHERE interior_id = ?
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
};
