import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "../assets/logo.png";

export async function generateCarbonReportPDF(company, emissions, aiInsights) {
  const doc = new jsPDF("p", "pt");
  doc.setFont("helvetica", "normal");
  const now = new Date();
  const dateStr = now.toLocaleDateString();

  // Load logo image for the PDF
  const imgElement = new Image();
  imgElement.src = logoImg;
  await new Promise((resolve, reject) => {
    imgElement.onload = resolve;
    imgElement.onerror = reject;
  });

  // Medium Logo Variant header (40x40 image)
  doc.addImage(imgElement, "PNG", 40, 30, 40, 40);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor("#1A2E1A"); // Carbon
  doc.text("Carbon", 92, 52);
  
  const textWidth = doc.getTextWidth("Carbon");
  doc.setTextColor("#97BC62"); // IQ
  doc.text("IQ", 92 + textWidth + 1, 52);

  doc.setFontSize(10);
  doc.setTextColor("#64748B"); // AI Carbon Analytics
  // jsPDF doesn't natively support tracking-widest, so we manually add spaces or accept the default font spacing.
  doc.text("AI CARBON ANALYTICS", 92, 66);

  // Divider
  doc.setDrawColor("#2C5F2D");
  doc.setLineWidth(1);
  doc.line(40, 84, 555, 84);

  // Metadata
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#111111");
  doc.text(
    `${company.name || "Your Organization"}  •  ${company.industry}  •  ${
      company.country
    }  •  Reporting year ${company.year}`,
    40,
    108
  );
  doc.text(`Generated on ${dateStr}`, 40, 126);

  const summaryTop = 160;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Executive Summary", 40, summaryTop);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const score = emissions.carbonScore?.toFixed?.(0) ?? "-";
  const grade = emissions.grade || "-";
  const total = (emissions.totalTonnes ?? emissions.total)?.toFixed?.(2) ?? "-";
  const perEmployee = emissions.perEmployee?.toFixed?.(2) ?? "-";

  const summaryLines = [
    `Total emissions are ${total} tonnes CO₂e, corresponding to approximately ${perEmployee} tonnes per employee.`,
    `Your CarbonIQ score is ${score}/100 (grade ${grade}).`,
    `The largest source of emissions is ${emissions.biggestSource || "not yet determined"}.`,
  ];

  doc.text(summaryLines, 40, summaryTop + 24, { maxWidth: 515 });

  const s1 = emissions.scope1 ?? 0;
  const s2 = emissions.scope2 ?? 0;
  const s3 = emissions.scope3 ?? 0;
  const totalNum = Number(total) || 1; // avoid div by 0

  autoTable(doc, {
    startY: summaryTop + 80,
    head: [["Scope", "Description", "Emissions (t CO₂e)", "% of Total"]],
    body: [
      ["Scope 1", "Direct emissions from owned/controlled sources", s1.toFixed(2), `${((s1 / totalNum) * 100).toFixed(1)}%`],
      ["Scope 2", "Indirect emissions from purchased electricity/heating", s2.toFixed(2), `${((s2 / totalNum) * 100).toFixed(1)}%`],
      ["Scope 3", "All other indirect emissions in value chain", s3.toFixed(2), `${((s3 / totalNum) * 100).toFixed(1)}%`],
      ["Total", "Total Location-Based Emissions", total, "100%"],
    ],
    styles: { font: "helvetica", fontSize: 10, textColor: "#111111" },
    headStyles: { fillColor: "#1A2E1A", textColor: "#FFFFFF", font: "helvetica" },
    alternateRowStyles: { fillColor: "#F4F9F0" },
    didParseCell: function (data) {
      if (data.row.index === 3 && data.section === 'body') {
        data.cell.styles.fillColor = "#1A2E1A";
        data.cell.styles.textColor = "#FFFFFF";
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: function (data) {
      if (data.column.index === 0 && data.section === 'body') {
        doc.setLineWidth(4);
        if (data.row.index === 0) doc.setDrawColor("#1A2E1A");
        else if (data.row.index === 1) doc.setDrawColor("#2C5F2D");
        else if (data.row.index === 2) doc.setDrawColor("#97BC62");
        else return;

        doc.line(data.cell.x, data.cell.y + 1, data.cell.x, data.cell.y + data.cell.height - 1);
      }
    }
  });

  const afterScopesY = doc.lastAutoTable.finalY + 30;

  if (aiInsights?.top3_recommendations && Array.isArray(aiInsights.top3_recommendations)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Top Recommendations", 40, afterScopesY);

    const recRows = aiInsights.top3_recommendations.map((r, idx) => {
      const savings = Number(r.saving_tonnes) || 0;
      const costSaving = savings * 50;
      const costString = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(costSaving);
      return [
        `${idx + 1}. ${r.title}`,
        r.description,
        `${savings} t`,
        costString,
      ];
    });

    autoTable(doc, {
      startY: afterScopesY + 12,
      head: [["Recommendation", "Description", "Estimated saving", "Cost saving"]],
      body: recRows,
      styles: { font: "helvetica", fontSize: 9, cellWidth: "wrap" },
      headStyles: { fillColor: "#2C5F2D", font: "helvetica" },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 220 },
        2: { cellWidth: 80 },
        3: { cellWidth: 80 },
      },
    });
  }

  const afterRecsY = doc.lastAutoTable?.finalY
    ? doc.lastAutoTable.finalY + 30
    : afterScopesY + 40;

  if (aiInsights?.industry_benchmark_analysis) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Industry Benchmark & Risk", 40, afterRecsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(aiInsights.industry_benchmark_analysis, 40, afterRecsY + 18, {
      maxWidth: 515,
    });

    if (aiInsights.risk_score) {
      doc.text(
        `Overall regulatory and transition risk is assessed as ${aiInsights.risk_score}.`,
        40,
        afterRecsY + 52,
        { maxWidth: 515 }
      );
    }
    if (aiInsights.risk_explanation) {
      doc.text(aiInsights.risk_explanation, 40, afterRecsY + 68, {
        maxWidth: 515,
      });
    }
  }

  let roadmapStartY = doc.lastAutoTable?.finalY
    ? Math.max(doc.lastAutoTable.finalY + 40, 420)
    : 420;

  if (aiInsights?.roadmap && Array.isArray(aiInsights.roadmap) && aiInsights.roadmap.length) {
    doc.addPage();
    roadmapStartY = 60;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("12-Month Carbon Reduction Roadmap", 40, roadmapStartY);

    const roadmapRows = aiInsights.roadmap.map((step) => {
      const savings = Number(step.savingTonnes) || 0;
      const cost = Number(step.costUSD) || 0;
      const costStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cost);
      const title = step.title || step["action title"] || step.action || "";
      const desc = step.description ? `\n${step.description}` : "";
      
      return [
        step.monthName || `Month ${step.month}`,
        `${title}${desc}`,
        `${savings} t`,
        costStr,
        step.difficulty,
      ];
    });

    autoTable(doc, {
      startY: roadmapStartY + 16,
      head: [["Month", "Action", "Saving", "Cost", "Difficulty"]],
      body: roadmapRows,
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: "#1A2E1A", font: "helvetica" },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 240 },
        2: { cellWidth: 70 },
        3: { cellWidth: 70 },
        4: { cellWidth: 70 },
      },
    });
  }

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#1A2E1A");
  doc.text("Methodology Notes", 40, 60);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#111111");
  doc.text("Calculations based on DEFRA 2023 emission factors and GHG Protocol Corporate Standard.", 40, 80, { maxWidth: 515 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#1A2E1A");
  doc.text("Data Sources", 40, 110);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#111111");
  doc.text("Input data categories used: Electricity, Gas, Flights, Commuting, Landfill, Water.", 40, 130, { maxWidth: 515 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor("#1A2E1A");
  doc.text("Disclaimer", 40, 160);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor("#111111");
  doc.text("This report was generated by CarbonIQ AI Carbon Footprint Analyzer. Figures should be verified by a qualified sustainability professional before use in official regulatory submissions.", 40, 180, { maxWidth: 515 });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor("#64748B");
    doc.text(
      "Generated by CarbonIQ \u2013 AI Carbon Footprint Analyzer",
      40,
      doc.internal.pageSize.getHeight() - 30
    );
    doc.text(`Page ${i} of ${pageCount}`, 500, doc.internal.pageSize.getHeight() - 30);
  }

  doc.save(`CarbonIQ_Report_${company.name || "organization"}.pdf`);
}

