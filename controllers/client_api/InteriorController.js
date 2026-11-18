const commonController = require("../api/commonController");

module.exports = {
    getInterior: (req, res) => {
        const userId = req.user.id;
        try {
          var sql = `SELECT 
        nmf.id, 
        nmf.case_id, 
        nmf.project_name, 
        nmf.fp_no, 
        nmf.op_no, 
        nmf.b_no, 
        nmf.rs_no, 
        nmf.authority, 
        nmf.client_id,
        nmf.tentative_design,
        mc.name AS projectType, 
        mpt.title AS category, 
        v.name AS village, 
         u.first_name as client_name,
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
          left join users as u on u.id = nmf.client_id
           LEFT JOIN 
        new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          WHERE 
          nmf.is_deleted = 0   and nmfpd.application_name = "interior_design" and nmf.client_id = ?`;
    
          console.log(sql);
    
          db.query(sql, [userId], (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ error: true, message: err.sqlMessage, data: [] });
            } else if (result.length > 0) {
              res
                .status(200)
                .json({ error: false, message: "Record fetched", data: result });
            } else {
              res
                .status(200)
                .json({ error: false, message: "Not found", data: [] });
            }
          });
        } catch (err) {
          console.log(err);
          res.status(200).json({ message: "Server error", data: {}, error: true });
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

      get3dCategorybyid: (req, res) => {
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

      structuebyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          var sql = `SELECT 
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
  AND mas.interior_id = ?
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

      mepfbyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          var sql = `SELECT 
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
    AND mas.interior_id = ?
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

      getSpacePlannigbyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          let sql = `SELECT 
    msp.id,
    COALESCE(msp.name, 'No Name') AS name,
    sp.id AS spid,
    u.profile_picture,
    ru.profile_picture AS review_profile,
    sp.category_id,
    sp.internalstatus,
    sp.internalremark,
    sp.materialphoto,
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
AND msp.interior_id = ?`;
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

      fetchrndyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          var sql = `SELECT 
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
    COALESCE(q.vendors, '') AS vendors, 
    COALESCE(q.mobile_no, '') AS mobile_no, 
    COALESCE(q.price) AS price,
    COALESCE(q.remark) AS remark,
    COALESCE(q.status) AS status
FROM mst_quation AS mq
LEFT JOIN quotation AS q ON q.category_id = mq.id AND q.is_deleted = 0
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

      getContractorbyid: (req, res) => {
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
  COALESCE(ac.vendors, '') AS vendors, 
  COALESCE(ac.mobile_no, '') AS mobile_no, 
  COALESCE(ac.price) AS price,
   COALESCE(ac.remark) AS remark,
  COALESCE(ac.status) AS status
FROM mst_interior_contractor AS mac
LEFT JOIN interior_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
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
          COALESCE(m.vendor, '') AS vendors, 
          COALESCE(m.phone, '') AS phone, 
          COALESCE(m.material_photo, '') AS material_photo,
          COALESCE(m.material_name, '') AS material_name,
          COALESCE(m.rate, '') AS rate,
          COALESCE(m.remark, '') AS remark,
          COALESCE(m.status, '') AS status,
          m.is_done
          FROM mst_material AS mm
          LEFT JOIN material AS m ON m.category_id = mm.id AND m.is_deleted = 0
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

      getdcbyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          var sql = `SELECT 
        mc.id AS mc_id,
        mc.title,
        COALESCE(c.id, 0) AS cid,
        COALESCE(c.design_photo, '') AS design_photo,
        COALESCE(c.category_id, '') AS category_id,
         u.profile_picture,
        ru.profile_picture AS review_profile,
        COALESCE(c.remark, '') AS remark,
        COALESCE(c.internalstatus, '') AS internalstatus,
        COALESCE(c.internalremark, '') AS internalremark,
        COALESCE(c.clientstatus, '') AS clientstatus,
        COALESCE(c.clientremark, '') AS clientremark
        FROM mst_concept AS mc
        LEFT JOIN concept AS c ON c.category_id = mc.id AND c.is_deleted = 0
        LEFT JOIN users AS u ON u.id = c.created_by 
        LEFT JOIN users AS ru ON ru.id = c.review_by 
        WHERE mc.is_deleted = 0 
        AND mc.interior_id = ?
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

      fetchFinaldbyid: (req, res) => {
        var id = parseInt(req.params.id);
    
        if (typeof id === "undefined" || !id) {
          res
            .status(201)
            .json({ error: true, message: "Id is required", data: {} });
        } else {
          var sql = `select afd.id,afd.upload,afd.type,afd.status,afd.statusremark,afd.remark,afd.is_done,u.profile_picture
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

  studybyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT id,budget,summary from mst_study WHERE  interior_id=" +
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

  updateClientStatus: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.Id);

    // Use parameterized queries to avoid SQL injection and syntax errors
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
        }
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

  updateTDClientStatus: function (req, res) {
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
        }
      );
    });
  },

    
}