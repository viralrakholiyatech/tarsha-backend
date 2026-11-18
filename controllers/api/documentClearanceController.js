const {
  getImageWithFoldername,
} = require("../../services/FileService");


function attachStages(files) {
  return new Promise((resolve, reject) => {
    if (!files || !files.length) return resolve(files || []);
    const ids = files.map((f) => f.id);

    const sql = `
      SELECT
        nmf.id AS file_id,
        mpd.title AS title,
        CONCAT_WS(', ',
          CASE WHEN (
            SELECT dc.completed_date
            FROM document_collection dc
            WHERE dc.document_clearance_id = nmf.id
            ORDER BY dc.id
            LIMIT 1
          ) IS NOT NULL THEN 'D.C.' END,
          CASE WHEN EXISTS (
            SELECT 1 FROM outward_details od
            WHERE od.approval_id = nmf.id AND od.approval_plan IS NOT NULL
          ) THEN 'B.Permission' END,
          CASE WHEN EXISTS (
            SELECT 1 FROM fire_noc fn
            WHERE fn.approval_id = nmf.id AND fn.fire_noc_receipt IS NOT NULL
          ) THEN 'Fire Noc' END,
          CASE WHEN EXISTS (
            SELECT 1 FROM pv
            WHERE pv.approval_id = nmf.id AND pv.pv_file IS NOT NULL
          ) THEN 'P.V.' END
          -- TODO: add E-Nagar Portal completion check here (see note below)
        ) AS status
      FROM new_mst_file nmf
      JOIN new_mst_file_details nmfd
        ON nmfd.project_id = nmf.id AND nmfd.source_type = 1
      LEFT JOIN mst_project_details mpd ON mpd.id = nmfd.project_name
      WHERE nmf.id IN (?)
    `;

    db.query(sql, [ids], (err, rows) => {
      if (err) return reject(err);

      const byFile = {};
      for (const r of rows) {
        if (!byFile[r.file_id]) byFile[r.file_id] = { status: r.status || "", stages: [] };
        byFile[r.file_id].stages.push({ title: r.title, status: r.status || "" });
      }

      resolve(
        files.map((f) => ({
          ...f,
          status: byFile[f.id]?.status || "",
          member_names: byFile[f.id]?.stages || [],
        }))
      );
    });
  });
}

function sendListWithStages(res, sql, params = []) {
  db.query(sql, params, async (err, result) => {
    if (err) {
      return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
    }
    if (!result.length) {
      return res.status(201).json({ error: false, message: "Not found", data: [] });
    }
    try {
      const data = await attachStages(result);
      return res.status(201).json({ error: false, message: "Record fetched", data });
    } catch (e) {
      return res
        .status(201)
        .json({ error: true, message: e.sqlMessage || e.message, data: {} });
    }
  });
}
module.exports = {


  //   getAllFile: async function (req, res) {
  //   var sql = `
  //   SELECT 
  //     nmf.id, 
  //     nmf.case_id, 
  //     nmf.project_name, 
  //     nmf.fp_no, 
  //     nmf.op_no, 
  //     nmf.b_no, 
  //     nmf.rs_no,
  //     nmf.ward_no,
  //     nmf.cs_no, 
  //     nmf.moje, 
  //     nmf.authority, 
  //     nmf.tentative_design,
  //     ANY_VALUE(mc.name) AS projectType, 
  //     ANY_VALUE(mpt.title) AS category, 
  //     ANY_VALUE(v.name) AS village, 
  //     ANY_VALUE(u.first_name) AS client_name,
  //     ANY_VALUE(tp.tpscheme) AS tpscheme
  //   FROM new_mst_file AS nmf
  //   LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
  //   LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //   LEFT JOIN village AS v ON v.id = nmf.village
  //   LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
  //   LEFT JOIN users AS u ON u.id = nmf.client_id
  //   LEFT JOIN new_mst_file_project_details AS nmfpd 
  //     ON nmfpd.project_id = nmf.id 
  //     AND nmfpd.is_deleted = 0 
  //     AND nmfpd.application_name = 'approval_process'
  //   WHERE nmfpd.project_id IS NOT NULL    
  //   GROUP BY nmf.id
  //   ORDER BY nmf.id DESC
  // `;

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       return res
  //         .status(201)
  //         .json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (!result.length) {
  //       return res
  //         .status(201)
  //         .json({ error: false, message: "Not found", data: [] });
  //     }

  //     res
  //       .status(201)
  //       .json({ error: false, message: "Record fetched", data: result });
  //   });
  // },
  getAllFile: async function (req, res) {
  const sql = `
    SELECT 
      nmf.id, 
      nmf.case_id, 
      nmf.project_name, 
      nmf.fp_no, 
      nmf.op_no, 
      nmf.b_no, 
      nmf.rs_no,
      nmf.ward_no,
      nmf.cs_no, 
      nmf.moje, 
      nmf.authority, 
      nmf.tentative_design,
      ANY_VALUE(mc.name) AS projectType, 
      ANY_VALUE(mpt.title) AS category, 
      ANY_VALUE(v.name) AS village, 
      ANY_VALUE(u.first_name) AS client_name,
      ANY_VALUE(tp.tpscheme) AS tpscheme
    FROM new_mst_file AS nmf
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN village AS v ON v.id = nmf.village
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd 
      ON nmfpd.project_id = nmf.id 
      AND nmfpd.is_deleted = 0 
      AND nmfpd.application_name = 'approval_process'
    WHERE nmfpd.project_id IS NOT NULL    
    GROUP BY nmf.id
    ORDER BY nmf.id DESC
  `;

  sendListWithStages(res, sql);
},
  getMembersdata: async function (req, res) {
    const projectId = req.params.id;

    if (!projectId || isNaN(projectId)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid project id", data: {} });
    }

    const sql = `
    SELECT nmf.id,
           mpd.title AS detail_title,
           TRIM(BOTH ',' FROM 
             CONCAT(
               CASE WHEN ANY_VALUE(dc.completed_date) IS NOT NULL THEN 'D.C, ' ELSE '' END,
               CASE WHEN ANY_VALUE(od.approval_plan) IS NOT NULL THEN 'B.Permission, ' ELSE '' END,
               CASE WHEN ANY_VALUE(fn.fire_noc_receipt) IS NOT NULL THEN 'Fire Noc, ' ELSE '' END,
               CASE WHEN ANY_VALUE(pv.pv_file) IS NOT NULL THEN 'P.V., ' ELSE '' END
             )
           ) AS status,
           nmfd.days AS detail_days,
           nmfd.completed_by,
           GROUP_CONCAT(DISTINCT eu.first_name ORDER BY eu.first_name SEPARATOR ', ') AS member_names,
           ANY_VALUE(a.first_name) AS hod,
           ANY_VALUE(lt.task) AS latest_task,
           ANY_VALUE(lt.status) AS latest_status,
           ANY_VALUE(lt.status_at) AS latest_status_at,
           CASE 
             WHEN ANY_VALUE(lt.status_at) IS NOT NULL 
             THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
             ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
           END AS remaining_days
    FROM new_mst_file AS nmf
    LEFT JOIN new_mst_file_details AS nmfd 
           ON nmfd.project_id = nmf.id AND nmfd.source_type = 1
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
    LEFT JOIN pv ON pv.approval_id = nmf.id
    LEFT JOIN (
        SELECT MIN(id) AS id, document_clearance_id
        FROM document_collection
        GROUP BY document_clearance_id
    ) AS dc_min ON dc_min.document_clearance_id = nmf.id
    LEFT JOIN document_collection AS dc ON dc.id = dc_min.id
    LEFT JOIN users AS eu 
           ON JSON_CONTAINS(nmfd.assign_members, CAST(eu.id AS JSON), '$')
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN (
        SELECT t1.*
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) AS lt ON lt.file_id = nmfd.id
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
    WHERE nmf.id = ?
    GROUP BY nmf.id, nmfd.id, nmfd.days, nmfd.completed_by, mpd.title
    ORDER BY nmf.id;
  `;

    const titleOrder = {
      "D.C.": 1,
      "P.V.": 2,
      "Fire Noc": 3,
      "E-Nagar Portal": 4,
      "B.Permission": 5,
    };

    db.query(sql, [projectId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const memberData = result
        .map((row) => ({
          member_names: row.member_names,
          status:row.status,
          title: row.detail_title,
          days: row.remaining_days,
          hod: row.hod,
          todo_status: row.latest_status,
          todo_date: row.latest_status_at,
        }))
        .sort((a, b) => {
          const orderA = titleOrder[a.title] ?? 999;
          const orderB = titleOrder[b.title] ?? 999;
          return orderA - orderB;
        });

      return res
        .status(200)
        .json({
          error: false,
          message: "Record fetched",
          data: { member_names: memberData },
        });
    });
  },
// getAllFile: async function (req, res) {
//   var sql = `
//     SELECT 
//       nmf.id, 
//       nmf.case_id, 
//       nmf.project_name, 
//       nmf.fp_no, 
//       nmf.op_no, 
//       nmf.b_no, 
//       nmf.rs_no,
//       nmf.ward_no,
//       nmf.cs_no, 
//       nmf.moje, 
//       nmf.authority, 
//       nmf.tentative_design,
//       ANY_VALUE(mc.name) AS projectType, 
//       ANY_VALUE(mpt.title) AS category, 
//       ANY_VALUE(v.name) AS village, 
//       ANY_VALUE(pv.pv_file) AS pv_file,
//       ANY_VALUE(u.first_name) AS client_name,
//       ANY_VALUE(fn.fire_noc_receipt) AS fire_noc_receipt,
//       ANY_VALUE(od.approval_plan) AS approval_plan,
//       ANY_VALUE(tp.tpscheme) AS tpscheme,
//       TRIM(BOTH ',' FROM 
//         CONCAT(
//           CASE WHEN ANY_VALUE(dc.completed_date) IS NOT NULL THEN 'D.C, ' ELSE '' END,
//           CASE WHEN ANY_VALUE(od.approval_plan) IS NOT NULL THEN 'B.Permission, ' ELSE '' END,
//           CASE WHEN ANY_VALUE(fn.fire_noc_receipt) IS NOT NULL THEN 'Fire Noc, ' ELSE '' END,
//           CASE WHEN ANY_VALUE(pv.pv_file) IS NOT NULL THEN 'P.V., ' ELSE '' END
//         )
//       ) AS status,

//       nmfd.id AS detail_id,
//       nmfd.days AS detail_days,
//       nmfd.completed_by,
//       mpd.title AS detail_title,
//       GROUP_CONCAT(DISTINCT eu.first_name ORDER BY eu.first_name SEPARATOR ', ') AS member_names,
//       ANY_VALUE(a.first_name) AS hod,
//       ANY_VALUE(lt.task) AS latest_task,
//       ANY_VALUE(lt.status) AS latest_status,
//       ANY_VALUE(lt.status_at) AS latest_status_at,
//       CASE 
//         WHEN ANY_VALUE(lt.status_at) IS NOT NULL 
//         THEN DATEDIFF(nmfd.completed_by, ANY_VALUE(lt.status_at))
//         ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
//       END AS remaining_days

//     FROM new_mst_file AS nmf
//     LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
//     LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
//     LEFT JOIN village AS v ON v.id = nmf.village
//     LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme
//     LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
//     LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
//     LEFT JOIN users AS u ON u.id = nmf.client_id
//     LEFT JOIN pv ON pv.approval_id = nmf.id
//     LEFT JOIN new_mst_file_project_details AS nmfpd 
//       ON nmfpd.project_id = nmf.id 
//       AND nmfpd.is_deleted = 0 
//       AND nmfpd.application_name = 'approval_process'
//     LEFT JOIN (
//       SELECT * FROM document_collection dc1
//       WHERE dc1.id = (
//         SELECT MIN(dc2.id) FROM document_collection dc2
//         WHERE dc2.document_clearance_id = dc1.document_clearance_id
//       )
//     ) AS dc ON dc.document_clearance_id = nmf.id
//     LEFT JOIN new_mst_file_details AS nmfd 
//       ON nmfd.project_id = nmf.id AND nmfd.source_type = 1 
//     LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name
//     LEFT JOIN users AS eu 
//       ON JSON_CONTAINS(nmfd.assign_members, CAST(eu.id AS JSON), '$')
//     LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
//     LEFT JOIN (
//       SELECT t1.*
//       FROM todos t1
//       INNER JOIN (
//         SELECT file_id, MAX(status_at) AS max_status_at
//         FROM todos
//         GROUP BY file_id
//       ) t2 ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
//     ) AS lt ON lt.file_id = nmfd.id

//     WHERE nmfpd.project_id IS NOT NULL    AND nmfd.is_deleted = 0
//     GROUP BY nmf.id, nmfd.id, nmfd.days, nmfd.completed_by, mpd.title
//     ORDER BY nmf.id
//   `;

//   const titleOrder = { "D.C.": 1, "P.V.": 2, "Fire NOC": 3, "E-Nagar Portal": 4, "B.Permission": 5 };

//   db.query(sql, function (err, result) {
//     if (err) {
//       return res.status(201).json({ error: true, message: err.sqlMessage, data: {} });
//     }

//     if (!result.length) {
//       return res.status(201).json({ error: false, message: "Not found", data: [] });
//     }

//     const fileMap = new Map();

//     result.forEach((row) => {
//       if (!fileMap.has(row.id)) {
//         fileMap.set(row.id, {
//           id: row.id,
//           case_id: row.case_id,
//           project_name: row.project_name,
//           fp_no: row.fp_no,
//           op_no: row.op_no,
//           b_no: row.b_no,
//           rs_no: row.rs_no,
//           ward_no: row.ward_no,
//           cs_no: row.cs_no,
//           moje: row.moje,
//           authority: row.authority,
//           tentative_design: row.tentative_design,
//           projectType: row.projectType,
//           category: row.category,
//           village: row.village,
//           pv_file: row.pv_file,
//           client_name: row.client_name,
//           fire_noc_receipt: row.fire_noc_receipt,
//           approval_plan: row.approval_plan,
//           tpscheme: row.tpscheme,
//           status: row.status,
//           hod: row.hod,
//           member_names: [],
//         });
//       }

//       if (row.detail_id) {
//         let mappedTitle = (row.detail_title || "")
//           .replace("E-Nagar Portal", "E-Nagar Portal")
//           .replace("Fire NOC", "Fire Noc")
//           .replace("B.Permission", "B.Permission")
//           .trim();

//         fileMap.get(row.id).member_names.push({
//           member_names: row.member_names,
//           title: mappedTitle,
//           days: row.remaining_days,
//           hod: row.hod,
//           todo_status: row.latest_status || null,
//           todo_date: row.latest_status_at || null,
//         });
//       }
//     });

//     const finalResult = Array.from(fileMap.values()).map((file) => {
//       file.member_names.sort((a, b) =>
//         (titleOrder[a.title] || 999) - (titleOrder[b.title] || 999)
//       );
//       return file;
//     });

//     res.status(201).json({ error: false, message: "Record fetched", data: finalResult });
//   });
// },


  getDCFile: async function (req, res) {
    const sql = `
    SELECT 
    nmf.id,  
    nmf.case_id, 
    nmf.project_name,  
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no, 
    nmf.ward_no,
    nmf.cs_no, 
    nmf.moje,
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    nmf.tentative_design,
    mpd.title AS land_type, 
    a.first_name AS hod,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    nmfd.days, 
    mpd.title,
    nmfd.completed_by,
    nmfd.assign_on,
    cu.first_name AS client_name,
 TRIM(BOTH ',' FROM 
        CONCAT(
          CASE WHEN ANY_VALUE(dc.completed_date) IS NOT NULL THEN 'D.C, ' ELSE '' END )
      ) AS status,
    -- Remaining days logic
    CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd 
        ON nmfd.project_id = nmf.id  
    LEFT JOIN mst_category AS mc 
        ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt 
        ON mpt.id = nmf.category 
    LEFT JOIN village AS v 
        ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp 
        ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd 
        ON mpd.id = nmfd.project_name 
    LEFT JOIN users AS u 
        ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
    LEFT JOIN users AS a 
        ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS cu 
        ON cu.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd 
        ON nmfpd.project_id = nmf.id
  LEFT JOIN (
      SELECT MIN(id) AS id, document_clearance_id
      FROM document_collection
      GROUP BY document_clearance_id
  ) AS dc_min ON dc_min.document_clearance_id = nmf.id
  LEFT JOIN document_collection AS dc ON dc.id = dc_min.id
    -- Latest todo subquery
    LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "D.C." 
    AND nmfpd.is_deleted = 0
    AND nmfpd.application_name = "approval_process"
    AND nmfd.source_type = 1
    AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, nmf.case_id, nmf.tentative_design, cu.first_name, nmf.project_name, 
    nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.completed_by, 
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, 
    mpd.title, a.first_name, nmfd.days, nmfd.assign_on, nmf.ward_no, nmf.cs_no, nmf.moje,
    latest.latest_status, latest.latest_status_at
    `;

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getPvFile: async function (req, res) {
    const sql = `
SELECT 
    nmf.id,  
    nmf.case_id, 
    nmf.project_name,  
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no,  
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    mpd.title AS land_type, 
    pv.pv_file,
     nmf.tentative_design,
    a.first_name AS hod,
    nmfd.days,
    mpd.title,
    nmfd.completed_by,
    nmfd.assign_on,
     cu.first_name as client_name,
    
    -- Show "-" if current date is before assign_on, otherwise calculate remaining days
    CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
        latest.latest_status,
    latest.latest_status_at,

    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    
    CASE 
        WHEN pv.pv_file IS NOT NULL THEN 'P.V.'
        ELSE ''
    END AS status

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN pv ON pv.approval_id = nmf.id
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    left join users as cu on cu.id = nmf.client_id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
     LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = 'P.V.' AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" AND nmfd.source_type = 1 AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, nmf.case_id, nmf.tentative_design, nmf.project_name,cu.first_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.days,
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, 
    nmfd.completed_by, nmfd.assign_on, latest.latest_status, latest.latest_status_at;
`;

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getFirenocFile: async function (req, res) {
    const sql = `
         SELECT 
    nmf.id,  
    nmf.case_id, 
    nmf.project_name,  
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no,  
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
     nmf.tentative_design,
    mpd.title AS land_type, 
    fn.fire_noc_receipt,
    a.first_name AS hod,
     cu.first_name as client_name,
    nmfd.days, 
    mpd.title,
    nmfd.assign_on, 
    nmfd.completed_by,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,

    -- Show "Fire Noc" if fire_noc_receipt is present, otherwise empty
    CASE 
        WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc'
        ELSE ''
    END AS status,

    -- Calculate remaining days only when assign_on is reached
     CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at
FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
       left join users as cu on cu.id = nmf.client_id
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "Fire NOC"  
    AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" AND nmfd.source_type = 1 AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, a.first_name, nmf.tentative_design, cu.first_name, nmf.case_id, nmfd.days, nmfd.assign_on, nmfd.completed_by, nmf.project_name, 
    nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.assign_members, nmf.authority, 
    mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, fn.fire_noc_receipt, latest.latest_status, latest.latest_status_at;

    `;

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },

  getEnagarportalFile: async function (req, res) {
    const sql = `
      SELECT 
    nmf.id,  
    nmf.case_id, 
    nmf.project_name,  
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no,  
    nmfd.assign_members,  
     nmf.tentative_design,
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    cu.first_name as client_name,
    mpd.title AS land_type, 
    a.first_name AS hod,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    nmfd.days, 
    mpd.title,
    nmfd.assign_on, 
    nmfd.completed_by,

    -- Calculate remaining days only when assign_on is reached
    CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
 left join users as cu on cu.id = nmf.client_id
 LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id
WHERE  
    mpd.title = "E-Nagar Portal"  
     AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" AND nmfd.source_type = 1 AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, a.first_name, nmf.tentative_design,cu.first_name, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, 
    nmfd.days, nmfd.assign_on, nmfd.completed_by, latest.latest_status, latest.latest_status_at;

    `;

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getBpermissionFile: async function (req, res) {
    const sql = `
SELECT 
    nmf.id,  
    nmf.case_id, 
    nmf.project_name,  
    nmf.fp_no, 
    nmf.op_no, 
    nmf.b_no, 
    nmf.rs_no,  
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    nmf.tentative_design,
    nmfd.days, 
    mpd.title,
    mpd.title AS land_type, 
    od.approval_plan,
    a.first_name AS hod,
    cu.first_name AS client_name,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
        CASE 
        WHEN od.approval_plan IS NOT NULL THEN 'B.Permission'
        ELSE ''
    END AS status,

    -- Remaining days logic
    CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL 
            THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,

    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd 
        ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc 
        ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt 
        ON mpt.id = nmf.category 
    LEFT JOIN village AS v 
        ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp 
        ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd 
        ON mpd.id = nmfd.project_name 
    LEFT JOIN outward_details AS od 
        ON od.approval_id = nmf.id
    LEFT JOIN users AS a 
        ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS cu 
        ON cu.id = nmf.client_id
    LEFT JOIN users AS u 
        ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
    LEFT JOIN new_mst_file_project_details AS nmfpd 
        ON nmfpd.project_id = nmf.id
    LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "B.Permission"  
    AND nmfpd.is_deleted = 0
    AND nmfpd.application_name = "approval_process" 
    AND nmfd.source_type = 1   AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no,
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme,
    nmf.tentative_design, nmfd.days, mpd.title, mpd.title, od.approval_plan,
    a.first_name, cu.first_name, nmfd.assign_on, nmfd.completed_by,
    latest.latest_status, latest.latest_status_at;
    `;

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
   empAllFile: (req, res) => {
    const userId = req.user.id; 
    const userIdString = String(userId); 
    const projectSql = `
      SELECT 
    nmf.id,
    nmf.case_id,
    nmf.project_name,
    nmf.fp_no,
    nmf.op_no,
    nmf.b_no,
    nmf.rs_no,
    nmf.authority,
    mc.name AS projectType,
    mpt.title AS category,
    v.name AS village,
    tp.tpscheme,
    a.first_name AS hod,
    nmfd.days,
    nmfd.completed_by,
    nmfd.assign_on,
    nmf.tentative_design 
FROM 
    new_mst_file AS nmf 
LEFT JOIN (
    SELECT nmfd1.*
    FROM new_mst_file_details AS nmfd1
    INNER JOIN (
        SELECT project_id, MAX(assign_on) AS max_assign_on
        FROM new_mst_file_details
        WHERE is_deleted = 0 AND source_type = 1
        GROUP BY project_id
    ) latest ON latest.project_id = nmfd1.project_id 
             AND latest.max_assign_on = nmfd1.assign_on
) AS nmfd ON nmfd.project_id = nmf.id 
LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
LEFT JOIN village AS v ON v.id = nmf.village 
LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
WHERE 
    EXISTS (
        SELECT 1 FROM new_mst_file_project_details AS nmfpd
        WHERE nmfpd.project_id = nmf.id
          AND nmfpd.is_deleted = 0
          AND nmfpd.application_name = 'approval_process'
    )
    AND (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
         OR nmfd.assign_to_hod = ?)
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
    nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, a.first_name, 
    nmfd.days, nmfd.completed_by, nmfd.assign_on, nmf.tentative_design;`;
db.query(projectSql, [userId, userId], function (err, projectResult) {
    if (err) {
      console.error("SQL Error:", err);
      return res
        .status(500)
        .json({ error: true, message: err.sqlMessage, data: {} });
    }

    return res.status(200).json({
      error: false,
      message: "Records fetched",
      data: projectResult,
    });
  });
},
  // empAllFile: (req, res) => {
  //   const userId = req.user.id; 
  //   const userIdString = String(userId); 
  //   const projectSql = `
  //     SELECT 
  //       nmf.id,
  //       nmf.case_id,
  //       nmf.project_name,
  //       nmf.fp_no,
  //       nmf.op_no,
  //       nmf.b_no,
  //       nmf.rs_no,
  //       nmf.authority,
  //       mc.name AS projectType,
  //       mpt.title AS category,
  //       v.name AS village,
  //       tp.tpscheme,
  //       pv.pv_file,
  //       fn.fire_noc_receipt,
  //       od.approval_plan,
  //       a.first_name AS hod,
  //       nmfd.days,
  //       nmfd.completed_by,
  //       nmfd.assign_on,
  //        nmf.tentative_design,
  //          CASE 
  //       WHEN CURDATE() < nmfd.assign_on THEN '-' 
  //       WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
  //       ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
  //   END AS remaining_days,
  //   latest.latest_status,
  //   latest.latest_status_at,
  //       mpd.title,
  //       GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
  //       TRIM(BOTH ',' FROM 
  //         CONCAT(
  //           CASE 
  //             WHEN od.approval_plan IS NOT NULL THEN 'B.Permission, ' 
  //             ELSE '' 
  //           END,
  //           CASE 
  //             WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc, ' 
  //             ELSE '' 
  //           END,
  //           CASE 
  //             WHEN pv.pv_file IS NOT NULL THEN 'P.V., ' 
  //             ELSE '' 
  //           END
  //         )
  //       ) AS status   
  //     FROM 
  //       new_mst_file AS nmf 
  //     LEFT JOIN 
  //       new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
  //     LEFT JOIN 
  //       mst_category AS mc ON mc.id = nmf.project_type 
  //     LEFT JOIN 
  //       mst_project_type AS mpt ON mpt.id = nmf.category 
  //     LEFT JOIN 
  //       village AS v ON v.id = nmf.village 
  //     LEFT JOIN 
  //       tpscheme AS tp ON tp.id = nmf.tpscheme 
  //     LEFT JOIN 
  //       mst_project_details AS mpd ON mpd.id = nmfd.project_name 
  //     LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
  //     LEFT JOIN 
  //       users AS a ON nmfd.assign_to_hod = a.id
  //     LEFT JOIN 
  //       outward_details AS od ON od.approval_id = nmf.id
  //     LEFT JOIN 
  //       fire_noc AS fn ON fn.approval_id = nmf.id
  //             LEFT JOIN 
  //   new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //     LEFT JOIN 
  //       pv ON pv.approval_id = nmf.id
  //         LEFT JOIN (
  //       SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
  //       FROM todos t1
  //       INNER JOIN (
  //           SELECT file_id, MAX(status_at) AS max_status_at
  //           FROM todos
  //           GROUP BY file_id
  //       ) t2 
  //       ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
  //   ) latest 
  //   ON latest.file_id = nmfd.id
  //     WHERE  nmfpd.is_deleted = 0
  //   and nmfpd.application_name  = "approval_process" AND
  //       (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  //       OR nmfd.assign_to_hod = ?) and nmfd.source_type =1  AND nmfd.is_deleted = 0
  //     GROUP BY 
  //       nmf.id, nmf.case_id, nmf.tentative_design, nmfd.completed_by, nmfd.assign_on, nmfd.days, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
  //       nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, fn.fire_noc_receipt, od.approval_plan, latest.latest_status, latest.latest_status_at`;

  //   db.query(projectSql, [userId, userId], function (err, projectResult) {
  //     if (err) {
  //       console.error("SQL Error:", err);
  //       return res
  //         .status(500)
  //         .json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     if (projectResult.length > 0) {
  //       const groupedResult = projectResult.reduce((acc, row) => {
  //         if (!acc[row.case_id]) {
  //           acc[row.case_id] = { ...row, member_names: [], status: "" };
  //         }

  //         acc[row.case_id].member_names.push({
  //           member_names: row.member_names,
  //           title: row.title,
  //           remaining_days: row.remaining_days,
  //           todo_status: row.latest_status || null,
  //         });

  //         acc[row.case_id].status += row.status;

  //         acc[row.case_id].remaining_days = row.remaining_days;

  //         return acc;
  //       }, {});

  //       const formattedprojectResult = Object.values(groupedResult);

  //       return res.status(200).json({
  //         success: true,
  //         message: "Records fetched",
  //         data: formattedprojectResult,
  //       });
  //     } else {
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Not found", data: [] });
  //     }
  //   });
  // },

  getempDCFile: async function (req, res) {
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
    nmfd.assign_members,
    nmfd.assign_to_hod,
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
     nmf.tentative_design,
    tp.tpscheme, 
    mpd.title AS land_type, 
    a.first_name AS hod,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    nmfd.days, 
    mpd.title,
    nmfd.completed_by,
    nmfd.assign_on,
     CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
      LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

       LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "D.C." 
     AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" and
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) AND nmfd.source_type = 1   AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, nmf.case_id, nmf.tentative_design,  nmfd.assign_to_hod,nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.completed_by, 
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, nmfd.days, 
    nmfd.assign_on, latest.latest_status, latest.latest_status_at;
    `;

    db.query(sql, [userId, userId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getempPvFile: async function (req, res) {
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
    nmfd.assign_members,  
     nmf.tentative_design,
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    mpd.title AS land_type, 
    pv.pv_file,
    a.first_name AS hod,
    nmfd.days,
    mpd.title,
    nmfd.completed_by,
    nmfd.assign_on,
    
    -- Show "-" if current date is before assign_on, otherwise calculate remaining days
    CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at,

    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    
    CASE 
        WHEN pv.pv_file IS NOT NULL THEN 'P.V.'
        ELSE ''
    END AS status

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN pv ON pv.approval_id = nmf.id
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = 'P.V.'  AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" and
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) AND nmfd.source_type = 1   AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, nmf.case_id, nmf.tentative_design, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.days,
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, 
    nmfd.completed_by, nmfd.assign_on,latest.latest_status, latest.latest_status_at;
`;

    db.query(sql, [userId, userId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getempFirenocFile: async function (req, res) {
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
    nmfd.assign_members,  
    nmf.authority,  
     nmf.tentative_design,
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    mpd.title AS land_type, 
    fn.fire_noc_receipt,
    a.first_name AS hod,
    nmfd.days, 
    mpd.title,
    nmfd.assign_on, 
    nmfd.completed_by,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,

    -- Show "Fire Noc" if fire_noc_receipt is present, otherwise empty
    CASE 
        WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc'
        ELSE ''
    END AS status,

    -- Calculate remaining days only when assign_on is reached
      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN fire_noc AS fn ON fn.approval_id = nmf.id
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "Fire NOC"  
    AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" and
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) AND nmfd.source_type = 1   AND nmfd.is_deleted = 0


GROUP BY 
    nmf.id, a.first_name, nmf.tentative_design, nmf.case_id, nmfd.days, nmfd.assign_on, nmfd.completed_by, nmf.project_name, 
    nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, nmfd.assign_members, nmf.authority, 
    mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, fn.fire_noc_receipt, latest.latest_status, latest.latest_status_at;

    `;

    db.query(sql, [userId, userId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },

  getempEnagarportalFile: async function (req, res) {
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
     nmf.tentative_design,
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    mpd.title AS land_type, 
    a.first_name AS hod,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    nmfd.days, 
    mpd.title,
    nmfd.assign_on, 
    nmfd.completed_by,

    -- Calculate remaining days only when assign_on is reached
      CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at
FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id
WHERE  
    mpd.title = "E-Nagar Portal"  
     AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process" and
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) AND nmfd.source_type = 1   AND nmfd.is_deleted = 0
GROUP BY 
    nmf.id, a.first_name, nmf.tentative_design,nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, 
    nmfd.days, nmfd.assign_on, nmfd.completed_by, latest.latest_status, latest.latest_status_at;

    `;

    db.query(sql, [userId, userId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  getempBpermissionFile: async function (req, res) {
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
     nmf.tentative_design, 
    nmfd.assign_members,  
    nmf.authority,  
    mc.name AS projectType, 
    mpt.title AS category,  
    v.name AS village, 
    tp.tpscheme, 
    nmfd.days, 
    mpd.title,
    mpd.title AS land_type, 
    od.approval_plan,
    a.first_name AS hod,
    GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
    CASE 
        WHEN od.approval_plan IS NOT NULL THEN 'B.Permission'
        ELSE ''
    END AS status,
        CASE 
        WHEN CURDATE() < nmfd.assign_on THEN '-' 
        WHEN latest.latest_status_at IS NOT NULL THEN DATEDIFF(nmfd.completed_by, latest.latest_status_at)
        ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
    END AS remaining_days,
    latest.latest_status,
    latest.latest_status_at

FROM 
    new_mst_file AS nmf 
    LEFT JOIN new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
    LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type 
    LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category 
    LEFT JOIN village AS v ON v.id = nmf.village 
    LEFT JOIN tpscheme AS tp ON tp.id = nmf.tpscheme 
    LEFT JOIN mst_project_details AS mpd ON mpd.id = nmfd.project_name 
    LEFT JOIN outward_details AS od ON od.approval_id = nmf.id
    LEFT JOIN users AS a ON nmfd.assign_to_hod = a.id
    LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
     LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id

        LEFT JOIN (
        SELECT t1.file_id, t1.status AS latest_status, t1.status_at AS latest_status_at
        FROM todos t1
        INNER JOIN (
            SELECT file_id, MAX(status_at) AS max_status_at
            FROM todos
            GROUP BY file_id
        ) t2 
        ON t1.file_id = t2.file_id AND t1.status_at = t2.max_status_at
    ) latest 
    ON latest.file_id = nmfd.id

WHERE  
    mpd.title = "B.Permission"  
    AND nmfpd.is_deleted = 0
    and nmfpd.application_name  = "approval_process"  and
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) AND nmfd.source_type = 1   AND nmfd.is_deleted = 0

GROUP BY 
    nmf.id, a.first_name, nmf.tentative_design, nmf.case_id, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
    nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, nmfd.completed_by,
    od.approval_plan, nmfd.days, nmfd.assign_on,latest.latest_status, latest.latest_status_at;

    `;

    db.query(sql, [userId, userId], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        const formattedResult = result.map((row) => ({
          ...row,
          member_names: [
            {
              member_names: row.member_names,
              title: row.title,
              days: row.remaining_days,
              todo_status: row.latest_status || null,
            },
          ],
        }));
        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },

  empProjectApproval: (req, res) => {
    const userId = req.params.id;

    const projectSql = `
      SELECT 
        nmf.id,
        nmf.case_id,
        nmf.project_name,
        nmf.fp_no,
        nmf.op_no,
        nmf.b_no,
        nmf.rs_no,
        nmf.authority,
        mc.name AS projectType,
        mpt.title AS category,
        v.name AS village,
        tp.tpscheme,
        pv.pv_file,
        fn.fire_noc_receipt,
        od.approval_plan,
        a.first_name AS hod,
        nmfd.days,
             cu.first_name as client_name,
        nmfd.completed_by,
        nmfd.assign_on,
        CASE 
          WHEN CURDATE() < nmfd.assign_on THEN '-' 
          ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
        END AS remaining_days, 
        mpd.title,
        GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
        TRIM(BOTH ',' FROM 
          CONCAT(
            CASE 
              WHEN od.approval_plan IS NOT NULL THEN 'B.Permission, ' 
              ELSE '' 
            END,
            CASE 
              WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc, ' 
              ELSE '' 
            END,
            CASE 
              WHEN pv.pv_file IS NOT NULL THEN 'P.V., ' 
              ELSE '' 
            END
          )
        ) AS status   
      FROM 
        new_mst_file AS nmf 
      LEFT JOIN 
        new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
      LEFT JOIN 
        mst_category AS mc ON mc.id = nmf.project_type 
      LEFT JOIN 
        mst_project_type AS mpt ON mpt.id = nmf.category 
      LEFT JOIN 
        village AS v ON v.id = nmf.village 
      LEFT JOIN 
        tpscheme AS tp ON tp.id = nmf.tpscheme 
      LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name 
      LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
        users AS a ON nmfd.assign_to_hod = a.id
      LEFT JOIN 
        outward_details AS od ON od.approval_id = nmf.id
      LEFT JOIN 
        fire_noc AS fn ON fn.approval_id = nmf.id
      LEFT JOIN 
        pv ON pv.approval_id = nmf.id
           left join users as cu on cu.id = nmf.client_id
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE nmfd.is_deleted = 0 AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfpd.assign_to_hod = ?)
         and nmfpd.application_name = "approval_process" AND nmfd.source_type = 1   AND nmfd.is_deleted = 0
      GROUP BY 
        nmf.id, nmf.case_id,cu.first_name, nmfd.completed_by, nmfd.assign_on, nmfd.days, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
        nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, fn.fire_noc_receipt, od.approval_plan`;

    db.query(projectSql, [userId, userId], function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (projectResult.length > 0) {
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
          });

          acc[row.case_id].status += row.status;

          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  empProjectArchitecture: (req, res) => {
    const userId = req.params.id;

    const projectSql = `
      SELECT 
        nmf.id,
        nmf.case_id,
        nmf.project_name,
        nmf.fp_no,
        nmf.op_no,
        nmf.b_no,
        nmf.rs_no,
        nmf.authority,
        mc.name AS projectType,
        mpt.title AS category,
        v.name AS village,
        tp.tpscheme,
        pv.pv_file,
        fn.fire_noc_receipt,
        od.approval_plan,
        a.first_name AS hod,
        nmfd.days,
            cu.first_name as client_name,
        nmfd.completed_by,
        nmfd.assign_on,
        CASE 
          WHEN CURDATE() < nmfd.assign_on THEN '-' 
          ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
        END AS remaining_days, 
        mpd.title,
        GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
        TRIM(BOTH ',' FROM 
          CONCAT(
            CASE 
              WHEN od.approval_plan IS NOT NULL THEN 'B.Permission, ' 
              ELSE '' 
            END,
            CASE 
              WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc, ' 
              ELSE '' 
            END,
            CASE 
              WHEN pv.pv_file IS NOT NULL THEN 'P.V., ' 
              ELSE '' 
            END
          )
        ) AS status   
      FROM 
        new_mst_file AS nmf 
      LEFT JOIN 
        new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
      LEFT JOIN 
        mst_category AS mc ON mc.id = nmf.project_type 
      LEFT JOIN 
        mst_project_type AS mpt ON mpt.id = nmf.category 
      LEFT JOIN 
        village AS v ON v.id = nmf.village 
      LEFT JOIN 
        tpscheme AS tp ON tp.id = nmf.tpscheme 
      LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name 
      LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
        users AS a ON nmfd.assign_to_hod = a.id
      LEFT JOIN 
        outward_details AS od ON od.approval_id = nmf.id
      LEFT JOIN 
        fire_noc AS fn ON fn.approval_id = nmf.id
      LEFT JOIN 
        pv ON pv.approval_id = nmf.id
           left join users as cu on cu.id = nmf.client_id
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE nmfpd.is_deleted = 0 AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?)
         and nmfpd.application_name = "architecture_design" AND nmfd.is_deleted = 0
      GROUP BY 
        nmf.id, nmf.case_id,cu.first_name, nmfd.completed_by, nmfd.assign_on, nmfd.days, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
        nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, fn.fire_noc_receipt, od.approval_plan`;

    db.query(projectSql, [userId, userId], function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (projectResult.length > 0) {
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
          });

          acc[row.case_id].status += row.status;

          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },
  empProjectInterior: (req, res) => {
    const userId = req.params.id;
    const projectSql = `
      SELECT 
        nmf.id,
        nmf.case_id,
        nmf.project_name,
        nmf.fp_no,
        nmf.op_no,
        nmf.b_no,
        nmf.rs_no,
        nmf.authority,
        mc.name AS projectType,
        mpt.title AS category,
        v.name AS village,
        tp.tpscheme,
        pv.pv_file,
        fn.fire_noc_receipt,
        od.approval_plan,
        a.first_name AS hod,
        nmfd.days,
             cu.first_name as client_name,
        nmfd.completed_by,
        nmfd.assign_on,
        CASE 
          WHEN CURDATE() < nmfd.assign_on THEN '-' 
          ELSE DATEDIFF(nmfd.completed_by, CURDATE()) 
        END AS remaining_days, 
        mpd.title,
        GROUP_CONCAT(u.first_name SEPARATOR ', ') AS member_names,
        TRIM(BOTH ',' FROM 
          CONCAT(
            CASE 
              WHEN od.approval_plan IS NOT NULL THEN 'B.Permission, ' 
              ELSE '' 
            END,
            CASE 
              WHEN fn.fire_noc_receipt IS NOT NULL THEN 'Fire Noc, ' 
              ELSE '' 
            END,
            CASE 
              WHEN pv.pv_file IS NOT NULL THEN 'P.V., ' 
              ELSE '' 
            END
          )
        ) AS status   
      FROM 
        new_mst_file AS nmf 
      LEFT JOIN 
        new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id 
      LEFT JOIN 
        mst_category AS mc ON mc.id = nmf.project_type 
      LEFT JOIN 
        mst_project_type AS mpt ON mpt.id = nmf.category 
      LEFT JOIN 
        village AS v ON v.id = nmf.village 
      LEFT JOIN 
        tpscheme AS tp ON tp.id = nmf.tpscheme 
      LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name 
      LEFT JOIN users AS u ON JSON_CONTAINS(nmfd.assign_members, CAST(u.id AS JSON), '$')  
      LEFT JOIN 
        users AS a ON nmfd.assign_to_hod = a.id
      LEFT JOIN 
        outward_details AS od ON od.approval_id = nmf.id
      LEFT JOIN 
        fire_noc AS fn ON fn.approval_id = nmf.id
      LEFT JOIN 
        pv ON pv.approval_id = nmf.id
           left join users as cu on cu.id = nmf.client_id
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE nmfpd.is_deleted = 0 AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?)
         and nmfpd.application_name = "interior_design" AND nmfd.source_type = 2 AND nmfd.is_deleted = 0
      GROUP BY 
        nmf.id, nmf.case_id,cu.first_name, nmfd.completed_by, nmfd.assign_on, nmfd.days, nmf.project_name, nmf.fp_no, nmf.op_no, nmf.b_no, nmf.rs_no, 
        nmfd.assign_members, nmf.authority, mc.name, mpt.title, v.name, tp.tpscheme, mpd.title, a.first_name, pv.pv_file, fn.fire_noc_receipt, od.approval_plan`;

    db.query(projectSql, [userId, userId], function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (projectResult.length > 0) {
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
          });

          acc[row.case_id].status += row.status;

          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Not found", data: [] });
      }
    });
  },

  getAllDocumentData: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `
       select nmfd.id,nmf.case_id,nmfd.assign_members,nmfd.assign_on,nmfd.completed_by,mpd.title
from new_mst_file_details as nmfd
left join new_mst_file as nmf
on nmf.id = nmfd.project_id
left join mst_project_details as mpd
on mpd.id = nmfd.project_name
         where nmf.id = ${id}`;

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
  deleteapprovaldocument: (req, res) => {
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
        WHERE application_name = "approval_process" AND project_id = ?
      `;

      const checksql = `SELECT id FROM new_mst_file_details WHERE project_id = ?`;
      const sql2 = `
        UPDATE todos 
        SET is_deleted = 1 
        WHERE file_id = ?
      `;

      // Step 1: Update project_details
      db.query(sql1, [data, id], (err1, result1) => {
        if (err1) {
          console.log("Error in sql1:", err1);
          return res.status(200).json({
            error: true,
            message: err1.sqlMessage,
            data: {},
          });
        }

        // Step 2: Get all related file IDs
        db.query(checksql, [id], (checkerr, checkresult) => {
          if (checkerr) {
            console.log("Error in checksql:", checkerr);
            return res.status(200).json({
              error: true,
              message: checkerr.sqlMessage,
              data: {},
            });
          }

          const fileIds = checkresult.map((row) => row.id);

          if (fileIds.length === 0) {
            return res.status(200).json({
              error: false,
              message: "Removed!",
              data: {},
            });
          }

          // Step 3: Mark todos as deleted for each file_id
          const updatePromises = fileIds.map((file_id) => {
            return new Promise((resolve, reject) => {
              db.query(sql2, [file_id], (err2, result2) => {
                if (err2) return reject(err2);
                resolve(result2);
              });
            });
          });

          Promise.all(updatePromises)
            .then(() => {
              return res.status(200).json({
                error: false,
                message: "Removed!",
                data: {},
              });
            })
            .catch((err3) => {
              console.log("Error updating todos:", err3);
              return res.status(200).json({
                error: true,
                message: err3.sqlMessage || "Error updating todos",
                data: {},
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

  deletedocumentclearance: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          is_deleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `new_mst_file_details` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getAllDocument: async function (req, res) {
    var sql = "select * from new_mst_document where is_deleted = 0";

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
  addorEdit: async (req, res) => {
    try {
      const user_id = req.user.id; // Get the user ID from JWT
      const this_data = req.body;

      const { type, selectedData, id } = this_data;

      // Validate input data
      if (!type || !selectedData || !Array.isArray(selectedData) || !id) {
        return res.status(400).json({ message: "Invalid data provided" });
      }

      // Insert new records
      for (const doc_id of selectedData) {
        try {
          const data = {
            document_clearance_id: id,
            doc_id: doc_id,
            type: type,
            created_at: getCurrentDateAndTime(),
            created_by: user_id,
            is_deleted: 0,
          };

          // Insert a new record
          const insertQuery = `
            INSERT INTO document_collection (document_clearance_id, doc_id,type, created_at, created_by, is_deleted)
            VALUES (?, ?, ?, ?, ?,?)
          `;
          await db.query(insertQuery, [
            data.document_clearance_id,
            data.doc_id,
            // data.team_id,
            data.type,
            data.created_at,
            data.created_by,
            data.is_deleted,
          ]);
        } catch (innerError) {
          console.error(`Error processing doc_id ${doc_id}:`, innerError);
          // Rollback transaction on error
          await db.rollback();
          return res.status(500).json({ message: "Failed to process records" });
        }
      }

      await db.commit();
      return res
        .status(200)
        .json({ message: "Records processed successfully" });
    } catch (error) {
      console.error("Error in addorEdit:", error);
      await db.rollback();
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getDocumentbyID: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `
        SELECT 
          dc.id,
          dc.team_id,
          dc.card,
          nmd.doc_name,
          dc.photo,
          dc.document_clearance_id,
          dc.doc_id,
          dc.type,
          dc.is_deleted 
        FROM 
          document_collection as dc  
        LEFT JOIN 
          new_mst_document as nmd 
        ON 
          nmd.id = dc.doc_id 
        WHERE 
          dc.is_deleted = 0 
        AND 
          dc.document_clearance_id = ${id}`;

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
  update: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    const docIds = Array.isArray(this_data.docIds)
      ? this_data.docIds
      : this_data.docIds
      ? [this_data.docIds]
      : [];
    const files = req.files || [];
    const fileUrls = Array.isArray(this_data.fileUrls)
      ? this_data.fileUrls
      : this_data.fileUrls
      ? [this_data.fileUrls]
      : Array.isArray(this_data.files)
      ? this_data.files
      : [];
    const ID = Array.isArray(this_data.ID) ? this_data.ID[0] : this_data.ID;

    if (!docIds || docIds.length === 0) {
      return res.status(400).json({
        error: true,
        message: "No document IDs provided",
        data: {},
      });
    }

    const updatePromises = docIds.map((id, index) => {
      return new Promise((resolve, reject) => {
        const selectSql = "SELECT * FROM `document_collection` WHERE `id` = ?";
        db.query(selectSql, [id], (err, result) => {
          if (err) return reject(err);

          let newFile = "";
          if (files[index]) {
            newFile = getImageWithFoldername(files[index].path);
          } else if (fileUrls[index]) {
            newFile = fileUrls[index];
          }

          const updateSql = `
            UPDATE document_collection
            SET photo = ?, updated_at = ?, updated_by = ?
            WHERE id = ?`;

          const updatedData = [
            newFile,
            getCurrentDateAndTime(),
            req?.user?.id,
            id,
          ];

          db.query(updateSql, updatedData, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
    });

    Promise.all(updatePromises)
      .then(() => {
        const checkSql = `
          SELECT COUNT(*) AS total_docs,
                 SUM(CASE WHEN photo IS NOT NULL AND photo != '' THEN 1 ELSE 0 END) AS filled_docs
          FROM document_collection
          WHERE is_deleted = 0 AND document_clearance_id = ?`;

        db.query(checkSql, [ID], (err, result) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage || err.message,
              data: {},
            });
          }

          const { total_docs, filled_docs } = result[0];

          if (total_docs === filled_docs) {
            const todayDate = getCurrentDate();

            const updateCompletionSql = `
              UPDATE document_collection
              SET completed_date = ?
              WHERE document_clearance_id = ?`;

            db.query(updateCompletionSql, [todayDate, ID], (err2) => {
              if (err2) {
                return res.status(500).json({
                  error: true,
                  message: err2.sqlMessage || err2.message,
                  data: {},
                });
              }

              // Fetch single source_id
              const fetchSourceSql = `
                SELECT id FROM new_mst_file_details
                WHERE source_type = 1 AND project_name = 1 AND project_id = ?`;

              db.query(fetchSourceSql, [ID], (err3, result3) => {
                if (err3) {
                  return res.status(500).json({
                    error: true,
                    message: err3.sqlMessage || err3.message,
                    data: {},
                  });
                }

                if (result3.length === 0) {
                  return res.status(200).json({
                    error: false,
                    message:
                      "Document updated and completed, but no matching task found",
                    data: {},
                  });
                }

                const sourceId = result3[0].id;

                const updateTaskSql = `
                  UPDATE todos
                  SET status = 1, status_at = ?
                  WHERE file_id = ?`;

                db.query(updateTaskSql, [todayDate, sourceId], (err4) => {
                  if (err4) {
                    return res.status(500).json({
                      error: true,
                      message: err4.sqlMessage || err4.message,
                      data: {},
                    });
                  }

                  return res.status(200).json({
                    error: false,
                    message:
                      "Document images updated, completion date set, and task marked as completed",
                    data: {},
                  });
                });
              });
            });
          } else {
            return res.status(200).json({
              error: false,
              message: "Document images updated successfully",
              data: {},
            });
          }
        });
      })
      .catch((err) => {
        res.status(500).json({
          error: true,
          message: err.sqlMessage || err.message,
          data: {},
        });
      });
  },

  // update: function (req, res) {
  //   const this_data = JSON.parse(JSON.stringify(req.body));
  //   const docIds = this_data.docIds;
  //   const files = req.files;
  //   const ID = Array.isArray(this_data.ID) ? this_data.ID[0] : this_data.ID;

  //   if (!docIds || docIds.length === 0) {
  //     return res
  //       .status(400)
  //       .json({ error: true, message: "No document IDs provided", data: {} });
  //   }

  //   if (files.length !== docIds.length) {
  //     return res.status(400).json({
  //       error: true,
  //       message: "Number of files does not match number of document IDs",
  //       data: {},
  //     });
  //   }

  //   const updatePromises = docIds.map((id, index) => {
  //     return new Promise((resolve, reject) => {
  //       const selectSql = "SELECT * FROM `document_collection` WHERE `id` = ?";
  //       db.query(selectSql, [id], (err, result) => {
  //         if (err) return reject(err);

  //         let oldFiles = result.length > 0 ? result[0].files : "";
  //         const newFile = getImageWithFoldername(files[index].path);
  //         const updatedFiles = oldFiles ? oldFiles + "," + newFile : newFile;

  //         const updateSql = `
  //                   UPDATE \`document_collection\`
  //                   SET \`photo\` = ?, \`updated_at\` = ?, \`updated_by\` = ?
  //                   WHERE \`id\` = ?`;
  //         const updatedData = [
  //           updatedFiles,
  //           getCurrentDateAndTime(),
  //           req?.user?.id,
  //           id,
  //         ];

  //         db.query(updateSql, updatedData, (err) => {
  //           if (err) return reject(err);
  //           resolve();
  //         });
  //       });
  //     });
  //   });

  //   Promise.all(updatePromises)
  //     .then(() => {
  //       const checkSql = `
  //       SELECT COUNT(*) AS total_docs,
  //              SUM(CASE WHEN photo IS NOT NULL AND photo != '' THEN 1 ELSE 0 END) AS filled_docs
  //       FROM document_collection
  //       WHERE is_deleted = 0 and document_clearance_id = ?`;

  //       db.query(checkSql, [ID], (err, result) => {
  //         if (err) {
  //           return res.status(500).json({
  //             error: true,
  //             message: err.sqlMessage || err.message,
  //             data: {},
  //           });
  //         }
  //         const { total_docs, filled_docs } = result[0];
  //         if (total_docs === filled_docs) {
  //           const updateCompletionSql = `
  //           UPDATE document_collection
  //           SET completed_date = ?
  //           WHERE document_clearance_id = ?`;
  //           const todayDate = getCurrentDate();
  //           db.query(updateCompletionSql, [todayDate, ID], (err2) => {
  //             if (err2) {
  //               return res.status(500).json({
  //                 error: true,
  //                 message: err2.sqlMessage || err2.message,
  //                 data: {},
  //               });
  //             }

  //             return res.status(200).json({
  //               error: false,
  //               message:
  //                 "Document images updated successfully and completion date set",
  //               data: {},
  //             });
  //           });
  //         } else {
  //           return res.status(200).json({
  //             error: false,
  //             message: "Document images updated successfully",
  //             data: {},
  //           });
  //         }
  //       });
  //     })
  //     .catch((err) => {
  //       res.status(500).json({
  //         error: true,
  //         message: err.sqlMessage || err.message,
  //         data: {},
  //       });
  //     });
  // },

  deletefiles: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          photo: "",
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `document_collection` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  deleteCollection: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN
          ? parseInt(req?.params?.id)
          : undefined;

      if (id) {
        const data = {
          is_deleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0,
        };

        var sql = "UPDATE `document_collection` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Removed!", data: {} });
          }
        });
      } else {
        res
          .status(200)
          .json({ error: true, message: "Invalid request", data: {} });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getdocumentclearacnebyId: (req, res) => {
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
    nmfd.assign_members,
    nmfd.assign_on,
    nmfd.completed_by,
    mpd.title,
    hu.profile_picture AS hod_pictures,
    GROUP_CONCAT(u.profile_picture) AS assign_picture
FROM 
    new_mst_file_details AS nmfd
LEFT JOIN 
    new_mst_file AS nmf ON nmf.id = nmfd.project_id
LEFT JOIN 
    mst_project_details AS mpd ON mpd.id = nmfd.project_name
LEFT JOIN 
    users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
LEFT JOIN 
    users AS hu ON hu.id = nmfd.assign_to_hod
WHERE 
    nmf.id = ? and nmfd.source_type = 1
GROUP BY 
    nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
    nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture;
;
`;

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

  getFileDetailsbyId: (req, res) => {
    var id = parseInt(req.params.id);
    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }
    var sql = `
   SELECT 
    nmfd.id,
    mpd.title AS application_name,
    GROUP_CONCAT(u.first_name ORDER BY u.first_name SEPARATOR ', ') AS member_names,
 GROUP_CONCAT(u.profile_picture) AS assign_pictures,
    hu.first_name AS hod_name,
    hu.profile_picture AS hod_picture,
    nmfd.days,
    nmfd.assign_on,
    nmfd.completed_by
FROM new_mst_file_details AS nmfd
LEFT JOIN 
     users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', '')) 
LEFT JOIN users AS hu 
    ON hu.id = nmfd.assign_to_hod
LEFT JOIN mst_project_details AS mpd 
    ON mpd.id = nmfd.project_name
WHERE nmfd.project_id = ? and source_type = 1
AND nmfd.is_deleted = 0
GROUP BY nmfd.id, mpd.title, hu.first_name, hu.profile_picture, nmfd.days, nmfd.assign_on, nmfd.completed_by
`;

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

  getAlltentative: (req, res) => {
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
    nmf.authority, 
    nmf.tentative_design,
    nmf.tentative_types, 
    mc.name AS projectType, 
    mpt.title AS category, 
    v.name AS village, 
    pv.pv_file,
     u.first_name as client_name,
    fn.fire_noc_receipt,
    od.approval_plan,
    tp.tpscheme

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
LEFT JOIN 
    fire_noc AS fn ON fn.approval_id = nmf.id
      left join users as u on u.id = nmf.client_id
LEFT JOIN 
    pv ON pv.approval_id = nmf.id
      WHERE 
      nmf.is_deleted = 0   and nmf.tentative_design = "yes"
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
};
