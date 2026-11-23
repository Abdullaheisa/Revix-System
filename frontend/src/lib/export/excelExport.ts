export interface ExcelColumnDef<T> {
  header: string;
  key: string;
  value: (row: T, index: number) => string | number | null | undefined;
  minWidth?: number;
  maxWidth?: number;
  isTextCode?: boolean;
  align?: "left" | "center" | "right";
}

export interface StyledExcelOptions<T> {
  fileName: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  isRtl?: boolean;
  columns: ExcelColumnDef<T>[];
  rows: T[];
}

export async function exportStyledExcel<T>({
  fileName,
  sheetName,
  title,
  subtitle,
  isRtl = true,
  columns,
  rows,
}: StyledExcelOptions<T>): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Revix ERP";
  workbook.created = new Date();

  const safeSheetName = sheetName.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Sheet1";
  const sheet = workbook.addWorksheet(safeSheetName, {
    views: [
      {
        state: "frozen",
        ySplit: 4,
        rightToLeft: isRtl,
        showGridLines: true,
      },
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const colCount = Math.max(1, columns.length);
  const fontName = "Calibri";

  // Row 1: Branded Title Banner
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: fontName, size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F5132" },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: isRtl ? "right" : "left",
    indent: 1,
  };
  sheet.getRow(1).height = 34;

  // Row 2: Subtitle / Export Metadata Bar
  sheet.mergeCells(2, 1, 2, colCount);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle || "";
  subCell.font = { name: fontName, size: 10, color: { argb: "FF065F46" } };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFECFDF5" },
  };
  subCell.alignment = {
    vertical: "middle",
    horizontal: isRtl ? "right" : "left",
    indent: 1,
  };
  sheet.getRow(2).height = 22;

  // Row 3: Subtle Spacer
  sheet.getRow(3).height = 8;

  // Row 4: Table Header
  const headerRow = sheet.getRow(4);
  headerRow.height = 28;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: fontName, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.align ?? (isRtl ? "right" : "left"),
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E293B" } },
      bottom: { style: "medium", color: { argb: "FF0F5132" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // AutoFilter on header row
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: colCount },
  };

  // Track max lengths for clean auto-width
  const colWidths = columns.map((c) => Math.max(c.minWidth ?? 14, c.header.length + 6));

  // Data Rows (starting at Row 5)
  rows.forEach((row, rIdx) => {
    const excelRow = sheet.getRow(5 + rIdx);
    excelRow.height = 23;
    const isEven = rIdx % 2 === 1;

    columns.forEach((col, cIdx) => {
      const rawVal = col.value(row, rIdx);
      const cell = excelRow.getCell(cIdx + 1);
      const strVal = rawVal == null || rawVal === "" ? "—" : String(rawVal);

      if (col.isTextCode) {
        cell.value = strVal;
        cell.numFmt = "@";
      } else {
        cell.value = rawVal == null || rawVal === "" ? "—" : rawVal;
      }

      cell.font = {
        name: fontName,
        size: 10.5,
        bold: cIdx === 0,
        color: { argb: strVal === "—" ? "FF94A3B8" : "FF0F172A" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.align ?? (col.isTextCode ? "center" : isRtl ? "right" : "left"),
        wrapText: false,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      const maxW = col.maxWidth ?? 42;
      colWidths[cIdx] = Math.min(maxW, Math.max(colWidths[cIdx], strVal.length + 6));
    });
  });

  // Apply auto-fitted column widths
  colWidths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
