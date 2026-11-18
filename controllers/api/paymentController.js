const {
  unlinkMultipleImages,
  getImageWithFoldername,
  unlinkSingleImage,
} = require("../../services/FileService");
const axios = require("axios");

const MSG91_AUTH_KEY = "391534AQdtoB5MBz63fded5dP1";
const MSG91_TEMPLATE_ID = "zaidexcel";
const MSG91_INTEGRATED_NUMBER = "919313699867";

async function sendPaymentWhatsApp({
  mobile_no,
  name,
  amount,
  category_name,
  date,
}) {
  try {
    const payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: MSG91_TEMPLATE_ID,
          language: {
            code: "en_US", // ← was "en"
            policy: "deterministic",
          },
          namespace: "59cc5cee_9f67_41c7_97b9_2d4517cdbd2e", // ← was missing
          to_and_components: [
            {
              to: [`91${mobile_no}`],
              components: {
                body_1: { type: "text", value: name },
                body_2: { type: "text", value: String(amount) },
                body_3: { type: "text", value: category_name },
                body_4: { type: "text", value: date },
              },
            },
          ],
        },
      },
    };

    await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: MSG91_AUTH_KEY,
        },
      },
    );

    console.log(`[WhatsApp] Sent to ${mobile_no}`);
  } catch (err) {
    console.error("[WhatsApp] Failed:", err?.response?.data || err.message);
  }
}

module.exports = {
  // ─────────────────────────────────────────────
  //  ADD CATEGORY
  // ─────────────────────────────────────────────
  addcategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    if (!this_data.name || this_data.name.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Category name is required.",
        data: {},
      });
    }

    const category = {
      name: this_data.name.trim(),
      whatsapp: this_data.whatsapp !== undefined ? this_data.whatsapp : 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query(
      "INSERT INTO payment_category SET ?",
      category,
      function (err, result) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Category has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },
  getPaymentcategory: function (req, res) {
    const sql = `
      SELECT id, name, whatsapp, created_at
      FROM   payment_category
      WHERE  is_deleted = 0
      ORDER  BY name ASC
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Categories fetched successfully.",
        data: rows,
      });
    });
  },

  getcategorybyid: function (req, res) {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    const sql = `
      SELECT id, name, whatsapp, created_at
      FROM   payment_category
      WHERE  id = ? AND is_deleted = 0
      LIMIT  1
    `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Category not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Category fetched successfully.",
        data: rows[0],
      });
    });
  },
  editcategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.params.id;
    const this_data = req.body;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    if (!this_data.name || this_data.name.trim() === "") {
      return res.status(400).json({
        error: true,
        message: "Category name is required.",
        data: {},
      });
    }

    // First check the category exists and is not deleted
    db.query(
      "SELECT id FROM payment_category WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Category not found.",
            data: {},
          });
        }

        const updatedCategory = {
          name: this_data.name.trim(),
          whatsapp: this_data.whatsapp !== undefined ? this_data.whatsapp : 0,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE payment_category SET ? WHERE id = ?",
          [updatedCategory, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Category has been updated successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  deletecategory: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    // Check the category exists before deleting
    db.query(
      "SELECT id FROM payment_category WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Category not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE payment_category SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Category has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  insertPayment: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    // ── Validation ───────────────────────────
    if (!this_data.name || this_data.name.trim() === "") {
      return res
        .status(400)
        .json({ error: true, message: "Name is required.", data: {} });
    }
    if (!this_data.mobile_no || !/^[0-9]{10}$/.test(this_data.mobile_no)) {
      return res.status(400).json({
        error: true,
        message: "Valid 10-digit mobile number is required.",
        data: {},
      });
    }
    if (!this_data.date) {
      return res
        .status(400)
        .json({ error: true, message: "Date is required.", data: {} });
    }
    if (!this_data.category_id) {
      return res
        .status(400)
        .json({ error: true, message: "Category is required.", data: {} });
    }
    if (
      !this_data.amount ||
      isNaN(parseFloat(this_data.amount)) ||
      parseFloat(this_data.amount) <= 0
    ) {
      return res
        .status(400)
        .json({ error: true, message: "Valid amount is required.", data: {} });
    }

    // ── First fetch the category to check whatsapp flag ──
    db.query(
      "SELECT id, name, whatsapp FROM payment_category WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [this_data.category_id],
      function (err, catRows) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (catRows.length === 0) {
          return res
            .status(404)
            .json({ error: true, message: "Category not found.", data: {} });
        }

        const category = catRows[0];

        const payment = {
          name: this_data.name.trim(),
          mobile_no: this_data.mobile_no,
          date: this_data.date,
          category_id: this_data.category_id,
          amount: parseFloat(this_data.amount),
          via_employee_id: this_data.via_employee_id || null,
          remarks: this_data.remarks ? this_data.remarks.trim() : null,
          created_by: user_id,
          created_at: getCurrentDateAndTime(),
          updated_at: null,
          updated_by: null,
          is_deleted: 0,
        };

        db.query(
          "INSERT INTO payments SET ?",
          payment,
          function (err2, result) {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }

            // ── Respond immediately, then send WhatsApp if enabled ──
            res.status(201).json({
              error: false,
              message: "Payment has been added successfully.",
              data: { id: result.insertId },
            });

            // Fire-and-forget — only if category has whatsapp = 1
            if (category.whatsapp === 1) {
              sendPaymentWhatsApp({
                mobile_no: this_data.mobile_no,
                name: this_data.name.trim(),
                amount: parseFloat(this_data.amount),
                category_name: category.name,
                date: this_data.date,
              });
            }
          },
        );
      },
    );
  },

  // ─────────────────────────────────────────────
  //  GET ALL PAYMENTS  (list)
  // ─────────────────────────────────────────────
  getPayments: function (req, res) {
    const sql = `
      SELECT
        p.id,
        p.name,
        p.mobile_no,
        p.date,
        p.amount,
        p.remarks,
        p.created_at,
        pc.name        AS category_name,
        pc.id          AS category_id
      FROM   payments p
      LEFT JOIN payment_category pc ON pc.id = p.category_id  AND pc.is_deleted = 0
      WHERE  p.is_deleted = 0
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      return res.status(200).json({
        error: false,
        message: "Payments fetched successfully.",
        data: rows,
      });
    });
  },

  // ─────────────────────────────────────────────
  //  GET SINGLE PAYMENT BY ID
  // ─────────────────────────────────────────────
  getPaymentById: function (req, res) {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Payment ID is required.", data: {} });
    }

    const sql = `
      SELECT
        p.id,
        p.name,
        p.mobile_no,
        p.date,
        p.amount,
        p.remarks,
        p.category_id,
        p.via_employee_id
      FROM   payments p
      WHERE  p.id = ?
    `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: true, message: "Payment not found.", data: {} });
      }
      return res.status(200).json({
        error: false,
        message: "Payment fetched successfully.",
        data: rows[0],
      });
    });
  },

  // ─────────────────────────────────────────────
  //  UPDATE PAYMENT
  // ─────────────────────────────────────────────
  updatePayment: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;
    const this_data = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Payment ID is required.", data: {} });
    }
    if (!this_data.name || this_data.name.trim() === "") {
      return res
        .status(400)
        .json({ error: true, message: "Name is required.", data: {} });
    }
    if (!this_data.mobile_no || !/^[0-9]{10}$/.test(this_data.mobile_no)) {
      return res.status(400).json({
        error: true,
        message: "Valid 10-digit mobile number is required.",
        data: {},
      });
    }
    if (!this_data.date) {
      return res
        .status(400)
        .json({ error: true, message: "Date is required.", data: {} });
    }
    if (!this_data.category_id) {
      return res
        .status(400)
        .json({ error: true, message: "Category is required.", data: {} });
    }
    if (
      !this_data.amount ||
      isNaN(parseFloat(this_data.amount)) ||
      parseFloat(this_data.amount) <= 0
    ) {
      return res
        .status(400)
        .json({ error: true, message: "Valid amount is required.", data: {} });
    }

    // Check payment exists
    db.query(
      "SELECT id FROM payments WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ error: true, message: "Payment not found.", data: {} });
        }

        const updated = {
          name: this_data.name.trim(),
          mobile_no: this_data.mobile_no,
          date: this_data.date,
          category_id: this_data.category_id,
          amount: parseFloat(this_data.amount),
          via_employee_id: this_data.via_employee_id || null,
          remarks: this_data.remarks ? this_data.remarks.trim() : null,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE payments SET ? WHERE id = ?",
          [updated, id],
          function (err2) {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }
            return res.status(200).json({
              error: false,
              message: "Payment has been updated successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  // ─────────────────────────────────────────────
  //  DELETE PAYMENT  (soft delete)
  // ─────────────────────────────────────────────
  deletePayment: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id || req.params.id;

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Payment ID is required.", data: {} });
    }

    db.query(
      "SELECT id FROM payments WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (rows.length === 0) {
          return res
            .status(404)
            .json({ error: true, message: "Payment not found.", data: {} });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE payments SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res
                .status(500)
                .json({ error: true, message: err2.sqlMessage, data: {} });
            }
            return res.status(200).json({
              error: false,
              message: "Payment has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  // ledger
  GetLedgerGroup: function (req, res) {
    const sql = `
      SELECT id, name from ledger_group
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Ledger fetched successfully.",
        data: rows,
      });
    });
  },

  addledger: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const vendor = {
      name: this_data.name,
      ledger_group_id: this_data.ledger_group_id,
      whatsapp: this_data.whatsapp !== undefined ? this_data.whatsapp : 0,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO ledger_master SET ?", vendor, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Ledgers has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  getLedgers: function (req, res) {
    const sql = `
      SELECT lm.id, lm.name,lg.name as ledgerGroup,lm.whatsapp
      FROM   ledger_master as lm
      left join ledger_group as lg on lg.id = lm.ledger_group_id
      WHERE  lm.is_deleted = 0
      ORDER  BY lm.name ASC
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Ledgers fetched successfully.",
        data: rows,
      });
    });
  },

  getledgersbyid: function (req, res) {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    const sql = `
      SELECT id, name, ledger_group_id, whatsapp
      FROM   ledger_master
      WHERE  id = ? AND is_deleted = 0
      LIMIT  1
    `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Ledgers not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Ledgers fetched successfully.",
        data: rows[0],
      });
    });
  },

  deleteledgers: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Ledger ID is required.",
        data: {},
      });
    }

    // Check the ledger exists before deleting
    db.query(
      "SELECT id FROM ledger_master WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Ledger not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE ledger_master SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Ledger has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  updateLedger: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `ledger_master` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      console.log(result);

      const user_id = req?.user?.id;

      const ledger = {
        name: this_data.name,
        ledger_group_id: this_data.ledger_group_id,
        whatsapp: this_data.whatsapp !== undefined ? this_data.whatsapp : 0,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `ledger_master` SET " +
        "`name` = ?, " +
        "`ledger_group_id` = ?, " +
        "`whatsapp` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      // console.log("updateSql", updateSql);

      db.query(
        updateSql,
        [
          ledger.name,
          ledger.ledger_group_id,
          ledger.whatsapp,
          ledger.updated_at,
          parseInt(ledger.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "ledger has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  // receipts

  getReceiptfile: async function (req, res) {
    var sql = `
    SELECT 
      nmf.id,
      nmf.case_id,
      nmf.fp_no,nmf.ward_no,nmf.cs_no,nmf.b_no,nmf.op_no,nmf.rs_no,
      u.first_name,tp.tpscheme,
      GROUP_CONCAT(nmfpd.application_name) AS application_names,
      GROUP_CONCAT(nmfpd.price) AS prices
    FROM new_mst_file AS nmf
    LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      left join tpscheme as tp on tp.id = nmf.tpscheme
    WHERE nmf.is_deleted = 0
    GROUP BY nmf.id, nmf.case_id, u.first_name,tp.tpscheme, u.last_name,nmf.fp_no,nmf.ward_no,nmf.cs_no,nmf.b_no,nmf.op_no,nmf.rs_no
  `;

    const labelMap = {
      approval_process: "Approval Process",
      architecture_design: "Architecture Design",
      interior_design: "Interior Design",
    };

    db.query(sql, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(200)
          .json({ error: false, message: "Not found", data: [] });
      }

      const formatted = result.map((row) => {
        const names = row.application_names
          ? row.application_names.split(",")
          : [];
        const prices = row.prices ? row.prices.split(",") : [];

        const applications = names.map((name, index) => ({
          name: labelMap[name.trim()] || name.trim(),
          price: prices[index] ? parseFloat(prices[index].trim()) : null,
        }));

       return {
        id:       row.id,
        case_id:  row.case_id,
        fp_no:    row.fp_no,
        ward_no:  row.ward_no,
        cs_no:    row.cs_no,
        b_no:     row.b_no,
        op_no:    row.op_no,
        rs_no:    row.rs_no,
        first_name: row.first_name,
        tpscheme: row.tpscheme,
        applications,
      };
      });

      return res
        .status(200)
        .json({ error: false, message: "Record fetched", data: formatted });
    });
  },

  getReceipts: function (req, res) {
    const sql = `
select r.id,r.amount,r.date,r.created_at, nmf.case_id as project_name,  u.first_name as client_name, eu.first_name as via_employee_name, r.mode, r.receipt_image
from receipts as r
left join new_mst_file as nmf
on nmf.id = r.project_id
  LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN users AS eu ON eu.id = r.via_employee_id
     WHERE r.is_deleted = 0
     order by r.id desc

    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "receipts fetched successfully.",
        data: rows,
      });
    });
  },

  getReceiptsById: function (req, res) {
    const id = req.params.id || req.body.id;
    console.log("req.params", req.params);

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    const sql = `
     select id, amount, date, project_id, ledger_group_id, remarks, via_employee_id, receipt_image,services, mode from receipts where id = ? and is_deleted = 0
    `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Ledgers not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Receipts fetched successfully.",
        data: rows[0],
      });
    });
  },

  deleteReceipt: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Receipt ID is required.",
        data: {},
      });
    }

    // Check the receipt exists before deleting
    db.query(
      "SELECT id FROM receipts WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Receipt not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE receipts SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Receipt has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  addReceipt: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const files = [];
    let receipt_image = this_data.receipt_image || this_data.receipt || "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "receipt_image" || file.fieldname === "receipt") {
          receipt_image = getImageWithFoldername(file.path);
          files.push(receipt_image);
        } else {
          // Unlink unnecessary files
          // unlinkImage(file.path);
        }
      });
    }

    const receiptData = {
      date: this_data.date,
      project_id: this_data.project_id,
      ledger_group_id: this_data.ledger_group_id,
      remarks: this_data.remarks,
      amount: this_data.amount,
      via_employee_id: this_data.via_employee_id,
      services: this_data.services || null,
      receipt_image: receipt_image,
      mode: this_data.mode || "cash",
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO receipts SET ?", receiptData, function (err, result) {
      if (err) {
        unlinkMultipleImages(files);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Receipts has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  updateReceipt: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    var oldFiles = [];
    var newFiles = [];
    var receipt_image = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "receipt_image" || f.fieldname === "receipt") {
          receipt_image = getImageWithFoldername(f.path);
          newFiles.push(receipt_image);
        } else {
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    } else if (this_data.receipt_image !== undefined) {
      receipt_image = this_data.receipt_image;
    } else if (this_data.receipt !== undefined) {
      receipt_image = this_data.receipt;
    }

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `receipts` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        unlinkMultipleImages(newFiles);
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      if (result.length === 0) {
        unlinkMultipleImages(newFiles);
        return res.status(404).json({ error: true, message: "Receipt not found.", data: {} });
      }

      const existing = result[0];
      const isLocalFile = (f) => f && !f.startsWith("http") && !f.includes(".amazonaws.com/");

      if (receipt_image) {
        if (isLocalFile(existing.receipt_image)) {
          oldFiles.push(existing.receipt_image);
        }
      } else if (this_data.receipt_image_cleared === "true") {
        receipt_image = "";
        if (isLocalFile(existing.receipt_image)) {
          oldFiles.push(existing.receipt_image);
        }
      } else {
        receipt_image = existing.receipt_image;
      }

      const user_id = req?.user?.id;

      const receipt = {
        date: this_data.date,
        project_id: this_data.project_id,
        ledger_group_id: this_data.ledger_group_id,
        remarks: this_data.remarks,
        amount: this_data.amount,
        mode: this_data.mode,
        via_employee_id: this_data.via_employee_id,
        services: this_data.services || null,
        receipt_image: receipt_image,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `receipts` SET " +
        "`date` = ?, " +
        "`project_id` = ?, " +
        "`ledger_group_id` = ?, " +
        "`remarks` = ?, " +
        "`amount` = ?, " +
        "`mode` = ?, " +
        "`via_employee_id` = ?, " +
        "`services` = ?, " +
        "`receipt_image` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      db.query(
        updateSql,
        [
          receipt.date,
          receipt.project_id,
          receipt.ledger_group_id,
          receipt.remarks,
          receipt.amount,
          receipt.mode,
          receipt.via_employee_id,
          receipt.services,
          receipt.receipt_image,
          receipt.updated_at,
          parseInt(receipt.updated_by),
          id,
        ],
        (err, updateResult) => {
          if (err) {
            unlinkMultipleImages(newFiles);
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data);
          }

          if (oldFiles.length > 0) {
            unlinkMultipleImages(oldFiles);
          }

          const response = {
            error: false,
            message: "receipt has been updated...",
            data: {},
          };

          res.status(200).json(response);
        },
      );
    });
  },

  // payment expense

  getPaymentExpenses: function (req, res) {
    const sql = `
select r.id,r.amount,r.date,r.created_at, nmf.case_id as project_name,  u.first_name as client_name, eu.first_name as via_employee_name,r.mode, r.receipt_image, r.submitters_img1, r.submitters_img2, r.submitters_img3
from payments_expense as r
left join new_mst_file as nmf
on nmf.id = r.project_id
  LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN users AS eu ON eu.id = r.via_employee_id
     WHERE r.is_deleted = 0
     order by r.id desc

    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "payment expenses fetched successfully.",
        data: rows,
      });
    });
  },

  getPaymentExpesesById: function (req, res) {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Payment ID is required.",
        data: {},
      });
    }

    const sql = `
    SELECT
      id,
      amount,
      date,
      project_id,
      ledger_group_id,
      mode,
      remarks,
      via_employee_id,
      name,
      mobile,
      services,
      receipt_image,
      submitters_img1,
      submitters_img2,
      submitters_img3
    FROM payments_expense
    WHERE id = ? AND is_deleted = 0
  `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Payment not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Payment fetched successfully.",
        data: rows[0],
      });
    });
  },

  deletePaymentExpenses: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Payment ID is required.",
        data: {},
      });
    }

    // Check the receipt exists before deleting
    db.query(
      "SELECT id FROM payments_expense WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Receipt not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE payments_expense SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Payment has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  addPaymentExpense: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    const service = this_data.services || null;

    var files = [];
    var unnecessary_files = [];
    var receipt_image = this_data.receipt_image || "";
    var submitters_img1 = this_data.submitters_img1 || "";
    var submitters_img2 = this_data.submitters_img2 || "";
    var submitters_img3 = this_data.submitters_img3 || "";

    // Guard — req.files is undefined when Content-Type is application/json
    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "receipt_image") {
          receipt_image = getImageWithFoldername(f.path);
          files.push(receipt_image);
        } else if (f.fieldname === "submitters_img1") {
          submitters_img1 = getImageWithFoldername(f.path);
          files.push(submitters_img1);
        } else if (f.fieldname === "submitters_img2") {
          submitters_img2 = getImageWithFoldername(f.path);
          files.push(submitters_img2);
        } else if (f.fieldname === "submitters_img3") {
          submitters_img3 = getImageWithFoldername(f.path);
          files.push(submitters_img3);
        } else {
          unnecessary_files.push(getImageWithFoldername(f.path));
        }
      });
    }

    unlinkMultipleImages(unnecessary_files);

    // ── Fetch ledger to check whatsapp flag ──
    db.query(
      "SELECT id, name, whatsapp FROM ledger_master WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [this_data.ledger_group_id],
      function (err, catRows) {
        if (err) {
          unlinkMultipleImages(files);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (catRows.length === 0) {
          unlinkMultipleImages(files);
          return res
            .status(404)
            .json({ error: true, message: "Category not found.", data: {} });
        }

        const category = catRows[0];

        const vendor = {
          ledger_group_id: this_data.ledger_group_id,
          amount: this_data.amount,
          date: this_data.date,
          project_id: this_data.project_id,
          mode: this_data.mode,
          remarks: this_data.remarks,
          name: this_data.extra_name || null,
          mobile: this_data.extra_mobile || null,
          via_employee_id: this_data.via_employee_id,
          receipt_image: receipt_image || "",
          submitters_img1: submitters_img1 || "",
          submitters_img2: submitters_img2 || "",
          submitters_img3: submitters_img3 || "",
          services: service,
          created_at: getCurrentDateAndTime(),
          created_by: user_id,
          updated_at: null,
          updated_by: null,
          is_deleted: 0,
        };

        db.query(
          "INSERT INTO payments_expense SET ?",
          vendor,
          function (err, result) {
            if (err) {
              unlinkMultipleImages(files);
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            // ── Send WhatsApp before responding ──
            if (category.whatsapp === 1 && this_data.extra_mobile) {
              sendPaymentWhatsApp({
                mobile_no: this_data.extra_mobile,
                name: this_data.extra_name?.trim(),
                amount: parseFloat(this_data.amount),
                category_name: category.name,
                date: this_data.date,
              });
            }

            return res.status(201).json({
              error: false,
              message: "Payment expenses has been added successfully.",
              data: { id: result.insertId },
            });
          },
        );
      },
    );
  },
  updatePaymentExpense: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const user_id = req?.user?.id;
    const service = this_data.services || null;

    var oldFiles = [];
    var newFiles = [];

    var receipt_image = "";
    var submitters_img1 = "";
    var submitters_img2 = "";
    var submitters_img3 = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "receipt_image") {
          receipt_image = getImageWithFoldername(f.path);
          newFiles.push(receipt_image);
        } else if (f.fieldname === "submitters_img1") {
          submitters_img1 = getImageWithFoldername(f.path);
          newFiles.push(submitters_img1);
        } else if (f.fieldname === "submitters_img2") {
          submitters_img2 = getImageWithFoldername(f.path);
          newFiles.push(submitters_img2);
        } else if (f.fieldname === "submitters_img3") {
          submitters_img3 = getImageWithFoldername(f.path);
          newFiles.push(submitters_img3);
        } else {
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    }

    if (!receipt_image && this_data.receipt_image !== undefined) {
      receipt_image = this_data.receipt_image;
    }
    if (!submitters_img1 && this_data.submitters_img1 !== undefined) {
      submitters_img1 = this_data.submitters_img1;
    }
    if (!submitters_img2 && this_data.submitters_img2 !== undefined) {
      submitters_img2 = this_data.submitters_img2;
    }
    if (!submitters_img3 && this_data.submitters_img3 !== undefined) {
      submitters_img3 = this_data.submitters_img3;
    }

    // ── Fetch ledger to check whatsapp flag ──
    db.query(
      "SELECT id, name, whatsapp FROM ledger_master WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [this_data.ledger_group_id],
      function (err, catRows) {
        if (err) {
          unlinkMultipleImages(newFiles);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (catRows.length === 0) {
          unlinkMultipleImages(newFiles);
          return res
            .status(404)
            .json({ error: true, message: "Category not found.", data: {} });
        }

        const category = catRows[0];

        // ── Fetch existing record to preserve old images ──
        db.query(
          "SELECT * FROM `payments_expense` WHERE `id` = ?",
          [id],
          (err, result) => {
            if (err) {
              unlinkMultipleImages(newFiles);
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            if (result.length === 0) {
              unlinkMultipleImages(newFiles);
              return res
                .status(404)
                .json({ error: true, message: "Record not found.", data: {} });
            }

            const existing = result[0];
            const isLocal = (f) => f && !f.startsWith("http") && !f.includes(".amazonaws.com/");

            // Keep old image if no new one uploaded, queue old local for deletion if replaced
            if (receipt_image) {
              if (isLocal(existing.receipt_image)) oldFiles.push(existing.receipt_image);
            } else if (this_data.receipt_image_cleared === "true") {
              receipt_image = "";
              if (isLocal(existing.receipt_image)) oldFiles.push(existing.receipt_image);
            } else {
              receipt_image = existing.receipt_image;
            }

            if (submitters_img1) {
              if (isLocal(existing.submitters_img1)) oldFiles.push(existing.submitters_img1);
            } else if (this_data.submitters_img1_cleared === "true") {
              submitters_img1 = "";
              if (isLocal(existing.submitters_img1)) oldFiles.push(existing.submitters_img1);
            } else {
              submitters_img1 = existing.submitters_img1;
            }

            if (submitters_img2) {
              if (isLocal(existing.submitters_img2)) oldFiles.push(existing.submitters_img2);
            } else if (this_data.submitters_img2_cleared === "true") {
              submitters_img2 = "";
              if (isLocal(existing.submitters_img2)) oldFiles.push(existing.submitters_img2);
            } else {
              submitters_img2 = existing.submitters_img2;
            }

            if (submitters_img3) {
              if (isLocal(existing.submitters_img3)) oldFiles.push(existing.submitters_img3);
            } else if (this_data.submitters_img3_cleared === "true") {
              submitters_img3 = "";
              if (isLocal(existing.submitters_img3)) oldFiles.push(existing.submitters_img3);
            } else {
              submitters_img3 = existing.submitters_img3;
            }

            const paymentExpense = {
              amount: this_data.amount,
              date: this_data.date,
              project_id: this_data.project_id,
              ledger_group_id: this_data.ledger_group_id,
              mode: this_data.mode,
              remarks: this_data.remarks,
              name: this_data.extra_name || null,
              mobile: this_data.extra_mobile || null,
              via_employee_id: this_data.via_employee_id,
              services: service,
              receipt_image: receipt_image || "",
              submitters_img1: submitters_img1 || "",
              submitters_img2: submitters_img2 || "",
              submitters_img3: submitters_img3 || "",
              updated_at: getCurrentDateAndTime(),
              updated_by: user_id,
            };

            const updateSql =
              "UPDATE `payments_expense` SET " +
              "`amount` = ?, " +
              "`date` = ?, " +
              "`project_id` = ?, " +
              "`ledger_group_id` = ?, " +
              "`mode` = ?, " +
              "`remarks` = ?, " +
              "`name` = ?, " +
              "`mobile` = ?, " +
              "`via_employee_id` = ?, " +
              "`services` = ?, " +
              "`receipt_image` = ?, " +
              "`submitters_img1` = ?, " +
              "`submitters_img2` = ?, " +
              "`submitters_img3` = ?, " +
              "`updated_at` = ?, " +
              "`updated_by` = ? " +
              "WHERE `id` = ?";

            db.query(
              updateSql,
              [
                paymentExpense.amount,
                paymentExpense.date,
                paymentExpense.project_id,
                paymentExpense.ledger_group_id,
                paymentExpense.mode,
                paymentExpense.remarks,
                paymentExpense.name,
                paymentExpense.mobile,
                paymentExpense.via_employee_id,
                paymentExpense.services,
                paymentExpense.receipt_image,
                paymentExpense.submitters_img1,
                paymentExpense.submitters_img2,
                paymentExpense.submitters_img3,
                paymentExpense.updated_at,
                parseInt(paymentExpense.updated_by),
                id,
              ],
              (err, result) => {
                if (err) {
                  unlinkMultipleImages(newFiles);
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }

                // ── Delete old replaced images ──
                if (oldFiles.length > 0) {
                  unlinkMultipleImages(oldFiles);
                }

                // ── Send WhatsApp if enabled ──
                if (category.whatsapp === 1 && this_data.extra_mobile) {
                  sendPaymentWhatsApp({
                    mobile_no: this_data.extra_mobile,
                    name: this_data.extra_name?.trim(),
                    amount: parseFloat(this_data.amount),
                    category_name: category.name,
                    date: this_data.date,
                  });
                }

                return res.status(200).json({
                  error: false,
                  message: "Payment expense has been updated successfully.",
                  data: {},
                });
              },
            );
          },
        );
      },
    );
  },
  getIncomeLedgers: function (req, res) {
    const sql = `
      SELECT lm.id, lm.name,lg.name as ledgerGroup,lm.whatsapp
      FROM   ledger_master as lm
      left join ledger_group as lg on lg.id = lm.ledger_group_id
      WHERE  lm.is_deleted = 0 and lm.ledger_group_id = 1
      ORDER  BY lm.name ASC
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Ledgers fetched successfully.",
        data: rows,
      });
    });
  },

  getExpenseLedgers: function (req, res) {
    const sql = `
      SELECT lm.id, lm.name,lg.name as ledgerGroup,lm.whatsapp
      FROM   ledger_master as lm
      left join ledger_group as lg on lg.id = lm.ledger_group_id
      WHERE  lm.is_deleted = 0 and lm.ledger_group_id = 2
      ORDER  BY lm.name ASC
    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Ledgers fetched successfully.",
        data: rows,
      });
    });
  },

  getMonthlyReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      MONTH(date) AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
    FROM (
      SELECT date, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT date, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS combined
    GROUP BY MONTH(date)
    ORDER BY MONTH(date)
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const MONTH_NAMES = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const months = Array.from({ length: 12 }, (_, i) => {
        const found = rows.find((r) => r.month === i + 1);
        const income = parseFloat(found?.income || 0);
        const expense = parseFloat(found?.expense || 0);
        const profit = income - expense;
        return {
          month: i + 1,
          month_name: MONTH_NAMES[i],
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: months.reduce((s, m) => s + m.income, 0),
        expense: months.reduce((s, m) => s + m.expense, 0),
        profit: months.reduce((s, m) => s + m.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Report fetched successfully.",
        data: { year: selectedYear, months, totals },
      });
    });
  },

  // Project Report
  getProjectReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      p.id AS project_id,
      p.case_id,
      CONCAT(u.first_name) AS client_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT project_id, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT project_id, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN new_mst_file AS p ON p.id = t.project_id
    LEFT JOIN users   AS u ON u.id = p.client_id
    GROUP BY p.id, p.case_id, client_name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });

      const projects = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      return res.status(200).json({
        error: false,
        message: "Project report fetched.",
        data: { year: selectedYear, projects },
      });
    });
  },

  // Ledger Report
  getLedgerReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      lm.id   AS ledger_id,
      lm.name AS ledger_name,
      lg.name AS group_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT ledger_group_id, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT ledger_group_id, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN ledger_master AS lm ON lm.id = t.ledger_group_id
    LEFT JOIN ledger_group AS lg ON lg.id = lm.ledger_group_id
    GROUP BY lm.id, lm.name, lg.name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });

      const ledgers = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      return res.status(200).json({
        error: false,
        message: "Ledger report fetched.",
        data: { year: selectedYear, ledgers },
      });
    });
  },

  // Project detail
  getProjectReportDetail: function (req, res) {
    const { project_id, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.project_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.project_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [project_id, selectedYear, project_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },

  getLedgerReportDetail: function (req, res) {
    const { ledger_id, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.ledger_group_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.ledger_group_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [ledger_id, selectedYear, ledger_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },

  getMonthlyReportDetail: function (req, res) {
    const { month, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND MONTH(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE YEAR(p.date) = ? AND MONTH(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, selectedMonth, selectedYear, selectedMonth],
      (err, rows) => {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },

  // income

  getEscrowIncome: function (req, res) {
    const sql = `
select r.id,r.amount,r.date,r.created_at, nmf.case_id as project_name,  u.first_name as client_name, eu.first_name as via_employee_name, r.mode
from escrow_income as r
left join new_mst_file as nmf
on nmf.id = r.project_id
  LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN users AS eu ON eu.id = r.via_employee_id
     WHERE r.is_deleted = 0
     order by r.id desc

    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Escrow income fetched successfully.",
        data: rows,
      });
    });
  },

  getEscrowIncomeById: function (req, res) {
    const id = req.params.id || req.body.id;
    console.log("req.params", req.params);

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Category ID is required.",
        data: {},
      });
    }

    const sql = `
     select id, amount, date, project_id,  remarks, via_employee_id,services, mode from escrow_income where id = ? and is_deleted = 0
    `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Escrow income not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Escrow income fetched successfully.",
        data: rows[0],
      });
    });
  },

  deleteEscrowIncome: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Escrow income ID is required.",
        data: {},
      });
    }

    // Check the receipt exists before deleting
    db.query(
      "SELECT id FROM escrow_income WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Receipt not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE escrow_income SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Escrow income has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  addEscrowIncome: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    console.log("this_data", this_data);

    const receiptData = {
      date: this_data.date,
      project_id: this_data.project_id,
      remarks: this_data.remarks,
      amount: this_data.amount,
      via_employee_id: this_data.via_employee_id,
      services: this_data.services || null,
      mode: this_data.mode || "cash",
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    console.log("receiptData", receiptData);

    db.query(
      "INSERT INTO escrow_income SET ?",
      receiptData,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Escrow income has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  updateEscrowIncome: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `escrow_income` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      const user_id = req?.user?.id;

      const receipt = {
        date: this_data.date,
        project_id: this_data.project_id,
        remarks: this_data.remarks,
        amount: this_data.amount,
        mode: this_data.mode,
        via_employee_id: this_data.via_employee_id,
        services: this_data.services || null,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `escrow_income` SET " +
        "`date` = ?, " +
        "`project_id` = ?, " +
        "`remarks` = ?, " +
        "`amount` = ?, " +
        "`mode` = ?, " +
        "`via_employee_id` = ?, " +
        "`services` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      // console.log("updateSql", updateSql);

      db.query(
        updateSql,
        [
          receipt.date,
          receipt.project_id,
          receipt.remarks,
          receipt.amount,
          receipt.mode,
          receipt.via_employee_id,
          receipt.services,
          receipt.updated_at,
          parseInt(receipt.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "escrow income has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        },
      );
    });
  },

  // expense
  getEscrowExpenses: function (req, res) {
    const sql = `
select r.id,r.amount,r.date,r.receipt_image,r.created_at, nmf.case_id as project_name,  u.first_name as client_name, eu.first_name as via_employee_name,r.mode
from escrow_expense as r
left join new_mst_file as nmf
on nmf.id = r.project_id
  LEFT JOIN users AS u ON u.id = nmf.client_id
    LEFT JOIN users AS eu ON eu.id = r.via_employee_id
     WHERE r.is_deleted = 0
     order by r.id desc

    `;

    db.query(sql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "escrow expenses fetched successfully.",
        data: rows,
      });
    });
  },

  getEscrowExpensesById: function (req, res) {
    const id = req.params.id || req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Escrow expense ID is required.",
        data: {},
      });
    }

    const sql = `
    SELECT
      id,
      amount,
      date,
      project_id,
      receipt_image,
      ledger_group_id,
      mode,
      remarks,
      via_employee_id,
      name,
      mobile,
      services
    FROM escrow_expense
    WHERE id = ? AND is_deleted = 0
  `;

    db.query(sql, [id], function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Escrow expense not found.",
          data: {},
        });
      }

      return res.status(200).json({
        error: false,
        message: "Escrow expense fetched successfully.",
        data: rows[0],
      });
    });
  },

  deleteEscrowExpenses: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const id = req.body.id;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Escrow expense ID is required.",
        data: {},
      });
    }

    // Check the receipt exists before deleting
    db.query(
      "SELECT id FROM escrow_expense WHERE id = ? AND is_deleted = 0",
      [id],
      function (err, rows) {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (rows.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Escrow expense not found.",
            data: {},
          });
        }

        const softDelete = {
          is_deleted: 1,
          updated_by: user_id,
          updated_at: getCurrentDateAndTime(),
        };

        db.query(
          "UPDATE escrow_expense SET ? WHERE id = ?",
          [softDelete, id],
          function (err2) {
            if (err2) {
              return res.status(500).json({
                error: true,
                message: err2.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Escrow expense has been deleted successfully.",
              data: { id: Number(id) },
            });
          },
        );
      },
    );
  },

  addEscrowExpense: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    const service = this_data.services || null;

    const files = [];
    let receipt_image = this_data.receipt_image || this_data.receipt || "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "receipt_image" || file.fieldname === "receipt") {
          receipt_image = getImageWithFoldername(file.path);
          files.push(receipt_image);
        } else {
          // Unlink unnecessary files
          // unlinkImage(file.path);
        }
      });
    }

    // ── Fetch ledger to check whatsapp flag ──
    db.query(
      "SELECT id, name, whatsapp FROM ledger_master WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [this_data.ledger_group_id],
      function (err, catRows) {
        if (err) {
          unlinkMultipleImages(files);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (catRows.length === 0) {
          unlinkMultipleImages(files);
          return res
            .status(404)
            .json({ error: true, message: "Category not found.", data: {} });
        }

        const category = catRows[0];

        const vendor = {
          ledger_group_id: this_data.ledger_group_id,
          amount: this_data.amount,
          date: this_data.date,
          project_id: this_data.project_id,
          mode: this_data.mode,
          remarks: this_data.remarks,
          name: this_data.name || null,
          mobile: this_data.mobile || null,
          via_employee_id: this_data.via_employee_id,
          services: service || null,
          receipt_image: receipt_image,
          created_at: getCurrentDateAndTime(),
          created_by: user_id,
          updated_at: null,
          updated_by: null,
          is_deleted: 0,
        };

        db.query(
          "INSERT INTO escrow_expense SET ?",
          vendor,
          function (err, result) {
            if (err) {
              unlinkMultipleImages(files);
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            // ── Send WhatsApp before responding ──
            if (category.whatsapp === 1 && this_data.mobile) {
              sendPaymentWhatsApp({
                mobile_no: this_data.mobile,
                name: this_data.name?.trim(),
                amount: parseFloat(this_data.amount),
                category_name: category.name,
                date: this_data.date,
              });
            }

            return res.status(201).json({
              error: false,
              message: "Escrow expense has been added successfully.",
              data: { id: result.insertId },
            });
          },
        );
      },
    );
  },
  updateEscrowExpenses: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const user_id = req?.user?.id;
    const service = this_data.services || null;

    var oldFiles = [];
    var newFiles = [];
    var receipt_image = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "receipt_image" || f.fieldname === "receipt") {
          receipt_image = getImageWithFoldername(f.path);
          newFiles.push(receipt_image);
        } else {
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    } else if (this_data.receipt_image !== undefined) {
      receipt_image = this_data.receipt_image;
    } else if (this_data.receipt !== undefined) {
      receipt_image = this_data.receipt;
    }

    // ── Fetch ledger to check whatsapp flag ──
    db.query(
      "SELECT id, name, whatsapp FROM ledger_master WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [this_data.ledger_group_id],
      function (err, catRows) {
        if (err) {
          unlinkMultipleImages(newFiles);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }
        if (catRows.length === 0) {
          unlinkMultipleImages(newFiles);
          return res
            .status(404)
            .json({ error: true, message: "Category not found.", data: {} });
        }

        const category = catRows[0];

        // ── Fetch existing record to preserve old images ──
        db.query(
          "SELECT * FROM `escrow_expense` WHERE `id` = ?",
          [id],
          (err, result) => {
            if (err) {
              unlinkMultipleImages(newFiles);
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            if (result.length === 0) {
              unlinkMultipleImages(newFiles);
              return res
                .status(404)
                .json({ error: true, message: "Record not found.", data: {} });
            }

            const existing = result[0];
            const isLocal = (f) => f && !f.startsWith("http") && !f.includes(".amazonaws.com/");

            if (receipt_image) {
              if (isLocal(existing.receipt_image)) oldFiles.push(existing.receipt_image);
            } else if (this_data.receipt_image_cleared === "true") {
              receipt_image = "";
              if (isLocal(existing.receipt_image)) oldFiles.push(existing.receipt_image);
            } else {
              receipt_image = existing.receipt_image;
            }

            const paymentExpense = {
              amount: this_data.amount,
              date: this_data.date,
              project_id: this_data.project_id,
              ledger_group_id: this_data.ledger_group_id,
              mode: this_data.mode,
              remarks: this_data.remarks,
              name: this_data.name || null,
              mobile: this_data.mobile || null,
              via_employee_id: this_data.via_employee_id,
              services: service,
              receipt_image: receipt_image,
              updated_at: getCurrentDateAndTime(),
              updated_by: user_id,
            };

            const updateSql =
              "UPDATE `escrow_expense` SET " +
              "`amount` = ?, " +
              "`date` = ?, " +
              "`project_id` = ?, " +
              "`ledger_group_id` = ?, " +
              "`mode` = ?, " +
              "`remarks` = ?, " +
              "`name` = ?, " +
              "`mobile` = ?, " +
              "`via_employee_id` = ?, " +
              "`services` = ?, " +
              "`receipt_image` = ?, " +
              "`updated_at` = ?, " +
              "`updated_by` = ? " +
              "WHERE `id` = ?";

            db.query(
              updateSql,
              [
                paymentExpense.amount,
                paymentExpense.date,
                paymentExpense.project_id,
                paymentExpense.ledger_group_id,
                paymentExpense.mode,
                paymentExpense.remarks,
                paymentExpense.name,
                paymentExpense.mobile,
                paymentExpense.via_employee_id,
                paymentExpense.services,
                paymentExpense.receipt_image,
                paymentExpense.updated_at,
                parseInt(paymentExpense.updated_by),
                id,
              ],
              (err, updateResult) => {
                if (err) {
                  unlinkMultipleImages(newFiles);
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }

                if (oldFiles.length > 0) {
                  unlinkMultipleImages(oldFiles);
                }

                return res.status(200).json({
                  error: false,
                  message: "Escrow expense has been updated successfully.",
                  data: {},
                });
              },
            );
          },
        );
      },
    );
  },

  getEscrowMonthlyReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      MONTH(date) AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
    FROM (
      SELECT date, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT date, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS combined
    GROUP BY MONTH(date)
    ORDER BY MONTH(date)
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const MONTH_NAMES = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const months = Array.from({ length: 12 }, (_, i) => {
        const found = rows.find((r) => r.month === i + 1);
        const income = parseFloat(found?.income || 0);
        const expense = parseFloat(found?.expense || 0);
        const profit = income - expense;
        return {
          month: i + 1,
          month_name: MONTH_NAMES[i],
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: months.reduce((s, m) => s + m.income, 0),
        expense: months.reduce((s, m) => s + m.expense, 0),
        profit: months.reduce((s, m) => s + m.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Report fetched successfully.",
        data: { year: selectedYear, months, totals },
      });
    });
  },

  getEscrowProjectReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      p.id AS project_id,
      p.case_id,
      CONCAT(u.first_name) AS client_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT project_id, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT project_id, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN new_mst_file AS p ON p.id = t.project_id
    LEFT JOIN users   AS u ON u.id = p.client_id
    GROUP BY p.id, p.case_id, client_name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });

      const projects = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      return res.status(200).json({
        error: false,
        message: "Project report fetched.",
        data: { year: selectedYear, projects },
      });
    });
  },

  // Ledger Report
  getEscrowLedgerReport: function (req, res) {
    const { year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      lm.id   AS ledger_id,
      lm.name AS ledger_name,
      lg.name AS group_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT  NULL AS ledger_group_id, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT ledger_group_id, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN ledger_master AS lm ON lm.id = t.ledger_group_id
    LEFT JOIN ledger_group AS lg ON lg.id = lm.ledger_group_id
    GROUP BY lm.id, lm.name, lg.name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });

      const ledgers = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      return res.status(200).json({
        error: false,
        message: "Ledger report fetched.",
        data: { year: selectedYear, ledgers },
      });
    });
  },

  getEscrowMonthlyReportDetail: function (req, res) {
    const { month, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND MONTH(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE YEAR(p.date) = ? AND MONTH(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, selectedMonth, selectedYear, selectedMonth],
      (err, rows) => {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },

  getEscrowProjectReportDetail: function (req, res) {
    const { project_id, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r
    
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.project_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.project_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [project_id, selectedYear, project_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },

  getEscrowLedgerReportDetail: function (req, res) {
    const { ledger_id, year } = req.query;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT r.date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r

    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT p.date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.ledger_group_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, ledger_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
        });
      },
    );
  },





};
