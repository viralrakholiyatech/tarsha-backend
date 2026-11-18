const commonController = require("../api/commonController");

module.exports = {
  getArchitecture: (req, res) => {
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
      nmf.is_deleted = 0  and nmfpd.application_name = "architecture_design" and nmf.client_id = ?`;

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
  fetchbddata: (req, res) => {
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
  fetcharchFinaldbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select afd.id,afd.upload,afd.type,afd.status,afd.statusremark,afd.is_done,afd.remark,u.profile_picture
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
  getarchQuotation: (req, res) => {
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
  COALESCE(av.vendors, '') AS vendors, 
  COALESCE(av.mobile_no, '') AS mobile_no, 
  COALESCE(av.price) AS price,
   COALESCE(av.remark) AS remark,
  COALESCE(av.status) AS status
FROM mst_arch_vendor AS mav
LEFT JOIN arch_vendor AS av ON av.category_id = mav.id AND av.is_deleted = 0
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
  getarchFees: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select id,price,remark,status from mst_arch_fees where is_deleted = 0 and arch_id = ?;
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
  COALESCE(ac.vendors, '') AS vendors, 
  COALESCE(ac.mobile_no, '') AS mobile_no, 
  COALESCE(ac.price) AS price,
   COALESCE(ac.remark) AS remark,
  COALESCE(ac.status) AS status
FROM mst_arch_contractor AS mac
LEFT JOIN arch_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
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
          COALESCE(m.vendor, '') AS vendors, 
          COALESCE(m.phone, '') AS phone, 
          COALESCE(m.material_photo, '') AS material_photo,
          COALESCE(m.material_name, '') AS material_name,
          COALESCE(m.rate, '') AS rate,
          COALESCE(m.remark, '') AS remark,
          COALESCE(m.status, '') AS status
          FROM mst_arch_material AS mam
          LEFT JOIN arch_material AS m ON m.category_id = mam.id AND m.is_deleted = 0
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

  getarchSpacePlannigbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
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
    asp.clientstatus,
    asp.clientremark,
    asp.team_id,
    asp.is_done
FROM mst_arch_space_planning AS masp
LEFT JOIN arch_space_planning AS asp ON asp.category_id = masp.id AND asp.is_deleted = 0
LEFT JOIN users AS u ON u.id = asp.created_by 
LEFT JOIN users AS ru ON ru.id = asp.review_by 
WHERE masp.is_deleted = 0 
AND masp.arch_id = ?`;
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

  fetcharchriskbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select marm.id,marm.upload,marm.remark,marm.agency,u.profile_picture,
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

  fetcharchdrwaingbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `SELECT 
        mad.id AS mad_id,
        mad.name,ad.is_done,
        COALESCE(ad.id, 0) AS adid,
         u.profile_picture,
    ru.profile_picture AS review_profile,
        COALESCE(ad.internalstatus, '') AS internalstatus,
        COALESCE(ad.design, '') AS design,
        COALESCE(ad.internalremark, '') AS internalremark,
        COALESCE(ad.clientstatus, '') AS clientstatus,
        COALESCE(ad.clientremark, '') AS clientremark
        FROM mst_arch_drawing AS mad
        LEFT JOIN arch_drawing AS ad ON ad.category_id = mad.id AND ad.is_deleted = 0
        LEFT JOIN users AS u ON u.id = ad.created_by 
       LEFT JOIN users AS ru ON ru.id = ad.review_by 
        WHERE mad.is_deleted = 0 
        AND mad.arch_id = ?
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



  getarch3dbyid: (req, res) => {
    var id = parseInt(req.params.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
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
AND mt.arch_id = ?`;
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
  archmepfbyid: (req, res) => {
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
  FROM mst_arch_mepf AS mas
  LEFT JOIN arch_mepf AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?;
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
  archstructuebyid: (req, res) => {
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
  FROM mst_arch_structure AS mas
  LEFT JOIN arch_structure AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?;
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


};
