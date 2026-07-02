import React, { useState } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Info } from "lucide-react";
import Papa from "papaparse";
export default function AddExpense() {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    tags: ""
  });
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      toast.error("Description and amount are required");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Analyzing and saving expense...", {
      style: { background: "var(--card-bg)", color: "var(--text-main)", border: "1px solid var(--border-main)" }
    });

    try {
      const response = await api.post("/expenses", {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : []
      });

      if (response.data.success) {
        toast.success(
          `Categorized as ${response.data.expense.category} (${Math.round(response.data.expense.categorization.confidence * 100)}% confident)`, 
          { id: loadingToast, duration: 4000 }
        );
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  //  CSV PARSER
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is actually a CSV
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a valid .csv file");
      return;
    }

    setCsvLoading(true);
    const importToast = toast.loading("Parsing statement & processing batch AI classification...", {
      style: { background: "var(--card-bg)", color: "var(--text-main)", border: "1px solid var(--border-main)" }
    });
try {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async (results) => {
  try {
    console.log(results.meta.fields);
    console.log(results.data);

    const headers = results.meta.fields.map(h => h.toLowerCase().trim());

    const dateKey = results.meta.fields[headers.findIndex(h => h.includes("date"))];
    const descKey = results.meta.fields[
      headers.findIndex(
        h =>
          h.includes("description") ||
          h.includes("desc") ||
          h.includes("narration") ||
          h.includes("particular")
      )
    ];
    const amountKey = results.meta.fields[
      headers.findIndex(
        h =>
          h.includes("amount") ||
          h.includes("value") ||
          h.includes("price")
      )
    ];

    if (!dateKey || !descKey || !amountKey) {
      throw new Error(
        "CSV must contain Date, Description and Amount columns."
      );
    }

    const parsedExpenses = results.data
      .map(row => ({
        date: String(row[dateKey] ?? "").trim(),
        description: String(row[descKey] ?? "").trim(),
        amount: String(row[amountKey] ?? "").trim()
      }))
      .filter(
        e =>
          e.date &&
          e.description &&
          !isNaN(parseFloat(e.amount))
      );

    console.log(parsedExpenses);

    if (parsedExpenses.length === 0) {
      throw new Error("No valid expenses found in CSV.");
    }

    const response = await api.post("/expenses/import/csv", {
      expenses: parsedExpenses
    });

    toast.success(
      `Imported ${response.data.imported} expenses successfully!`,
      {
        id: importToast
      }
    );

    setTimeout(() => navigate("/expenses"), 1500);
  } catch (err) {
    toast.error(
      err.response?.data?.message || err.message,
      { id: importToast }
    );
  } finally {
    setCsvLoading(false);
    e.target.value = "";
  }
},

    error(error) {
      toast.error(error.message, {
        id: importToast,
      });
      setCsvLoading(false);
    },
  });
} catch (err) {
  toast.error(err.message, {
    id: importToast,
  });
  setCsvLoading(false);
}
    // const reader = new FileReader();
    // reader.onload = async (event) => {
    //   try {
    //     const text = event.target.result;
    //     const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        
    //     if (lines.length <= 1) {
    //       throw new Error("CSV file is empty or missing data rows");
    //     }

    //     // Standard Banking Header Mapping: date, description, amount
    //     const headers = lines[0].toLowerCase().split(",");
    //     const dateIdx = headers.findIndex(h => h.includes("date"));
    //     const descIdx = headers.findIndex(h => h.includes("desc") || h.includes("title") || h.includes("particular"));
    //     const amtIdx = headers.findIndex(h => h.includes("amount") || h.includes("value") || h.includes("price"));

    //     if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
    //       throw new Error("CSV headers must explicitly include 'date', 'description', and 'amount'.");
    //     }

    //     const parsedExpenses = [];

    //     // Loop data lines (skipping header row)
    //     for (let i = 1; i < lines.length; i++) {
    //       const row = lines[i].split(",");
    //       // Ensure it's a complete line entry matching structural columns
    //       if (row.length >= headers.length) {
    //         parsedExpenses.push({
    //           date: row[dateIdx],
    //           description: row[descIdx],
    //           amount: row[amtIdx]
    //         });
    //       }
    //     }

    //     // Transmit cleanly structured batch payload to your API route
    //     const response = await api.post("/expenses/import/csv", { expenses: parsedExpenses });

    //     if (response.data.success) {
    //       toast.success(`S-Tier Success! AI categorized and imported ${response.data.imported} transactions.`, { id: importToast, duration: 5000 });
    //       setTimeout(() => navigate("/expenses"), 1500);
    //     }
    //   } catch (err) {
    //     toast.error(err.message || "Failed processing bank statement layout", { id: importToast });
    //   } finally {
    //     setCsvLoading(false);
    //     e.target.value = ""; // clear input stream anchor
    //   }
    // };

    // reader.readAsText(file);
  };

  return (
    <div className="animate-entry" style={{ maxWidth: "600px", margin: "20px auto", width: "100%" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "30px", fontWeight: "800", letterSpacing: "-0.5px", color: "var(--text-main)" }}>Add Expense</h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: "500" }}>Let the AI categorize your spending.</p>
      </div>

      <div className="glass-card" style={{ marginBottom: "30px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">Description *</label>
            <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="e.g., Uber to airport" required className="input-field" />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">Amount (₹) *</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" step="0.01" min="0" required className="input-field" />
          </div>

          <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
            <div>
              <label className="input-label">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="input-label">Tags (Optional)</label>
              <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., work, travel" className="input-field" />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Processing..." : "Save Transaction"}
          </button>
        </form>
      </div>

      {/* S-TIER BULK BANK STATEMENT IMPORT PANEL */}
      <div className="glass-card" style={{ border: "1px dashed var(--border-main)", background: "rgba(255, 255, 255, 0.01)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
          <div style={{ background: "var(--primary-soft)", padding: "8px", borderRadius: "8px", color: "var(--primary)" }}>
            <FileText size={20} />
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--text-main)" }}>Import Bank Statement</h3>
        </div>
        
        <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Upload your bank ledger spreadsheet format (.csv). FinSight's model parsing logic will map, analyze, and batch tag up to 100 entries automatically.
        </p>

      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "var(--bg-secondary)",
    padding: "10px 14px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid var(--border-main)",
  }}
>
  <Info size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
  <span
    style={{
      fontSize: "12px",
      color: "var(--text-muted)",
      lineHeight: "1.4",
    }}
  >
    <strong>Expected CSV Format:</strong> The file must contain the columns{" "}
    <code>date</code>, <code>description</code>, and <code>amount</code>.
    Dates must be in <code>YYYY-MM-DD</code> format (e.g.,{" "}
    <code>2026-07-01</code>).
  </span>
</div>

        <label className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: csvLoading ? "not-allowed" : "pointer", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}>
          <Upload size={18} />
          {csvLoading ? "Processing Batch Ingestion..." : "Choose Statement CSV"}
          <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={csvLoading} style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}

// import React, { useState } from "react";
// import api from "../utils/api";
// import toast from "react-hot-toast";
// import { useNavigate } from "react-router-dom";

// export default function AddExpense() {
//   const [formData, setFormData] = useState({
//     description: "",
//     amount: "",
//     date: new Date().toISOString().split("T")[0],
//     tags: ""
//   });
//   const [suggestedCategory, setSuggestedCategory] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleDescriptionChange = (e) => {
//     const description = e.target.value;
//     setFormData(prev => ({ ...prev, description }));
//     if (description.trim().length < 2) {
//       setSuggestedCategory(null);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!formData.description || !formData.amount) {
//       toast.error("Description and amount are required");
//       return;
//     }

//     setLoading(true);
//     const loadingToast = toast.loading("Analyzing and saving expense...", {
//       style: { background: "var(--card-bg)", color: "var(--text-main)", border: "1px solid var(--border-main)" }
//     });

//     try {
//       const response = await api.post("/expenses", {
//         description: formData.description,
//         amount: parseFloat(formData.amount),
//         date: formData.date,
//         tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : []
//       });

//       if (response.data.success) {
//         toast.success(
//           `Categorized as ${response.data.expense.category} (${Math.round(response.data.expense.categorization.confidence * 100)}% confident)`, 
//           { id: loadingToast, duration: 4000 }
//         );
        
//         setSuggestedCategory(response.data.expense);
        
//         setFormData({
//           description: "",
//           amount: "",
//           date: new Date().toISOString().split("T")[0],
//           tags: ""
//         });

//         setTimeout(() => navigate("/dashboard"), 1500);
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to add expense", { id: loadingToast });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="animate-entry" style={{ maxWidth: "600px", margin: "20px auto", width: "100%" }}>
//       <div style={{ marginBottom: "30px" }}>
//         <h1 style={{ margin: "0 0 8px", fontSize: "30px", fontWeight: "800", letterSpacing: "-0.5px", color: "var(--text-main)" }}>Add Expense</h1>
//         <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: "500" }}>Let the AI categorize your spending.</p>
//       </div>

//       <div className="glass-card">
//         <form onSubmit={handleSubmit}>
//           <div style={{ marginBottom: "20px" }}>
//             <label className="input-label">Description *</label>
//             <input 
//               type="text" 
//               name="description" 
//               value={formData.description} 
//               onChange={handleDescriptionChange} 
//               placeholder="e.g., Uber to airport" 
//               required 
//               className="input-field"
//             />
//           </div>

//           <div style={{ marginBottom: "20px" }}>
//             <label className="input-label">Amount (₹) *</label>
//             <input 
//               type="number" 
//               name="amount" 
//               value={formData.amount} 
//               onChange={handleChange} 
//               placeholder="0.00" 
//               step="0.01" 
//               min="0" 
//               required 
//               className="input-field"
//             />
//           </div>

//           <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
//             <div>
//               <label className="input-label">Date</label>
//               <input 
//                 type="date" 
//                 name="date" 
//                 value={formData.date} 
//                 onChange={handleChange} 
//                 className="input-field"
//               />
//             </div>
//             <div>
//               <label className="input-label">Tags (Optional)</label>
//               <input 
//                 type="text" 
//                 name="tags" 
//                 value={formData.tags} 
//                 onChange={handleChange} 
//                 placeholder="e.g., work, travel" 
//                 className="input-field"
//               />
//             </div>
//           </div>

//           <button type="submit" className="btn-primary" disabled={loading}>
//             {loading ? "Processing..." : "Save Transaction"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }