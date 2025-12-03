import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    ImageRun,
    TextRun,
    Header
} from "docx";
import { saveAs } from "file-saver";
import { buildAbuseDocxTable } from "./buildAbuseDocxTable";

// Helper to load PNG images as Uint8Array
async function loadImage(url) {
    // url may be a string or a URL object; ensure absolute URL via import.meta when calling
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load image: ${url} (${response.status})`);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

export async function generateAbuseReport(summary, totalRow) {
    try {
        // Use PNG images for better compatibility
        // Use import.meta URL so Vite/Esm resolves the correct runtime path
        const leftLogoData = await loadImage(new URL("../assets/baylogo.png", import.meta.url).href);
        const rightLogoData = await loadImage(new URL("../assets/bonfallogo.png", import.meta.url).href);

        const table = buildAbuseDocxTable(summary, totalRow);

        // // Header table with minimal padding (20 pixels = ~15pt)
        // const headerTable = new Table({
        //     width: { size: 100, type: WidthType.PERCENTAGE },
        //     rows: [
        //         new TableRow({
        //             children: [
        //                 // Left Logo
        //                 new TableCell({
        //                     width: { size: 15, type: WidthType.PERCENTAGE },
        //                     verticalAlign: AlignmentType.CENTER,
        //                     children: [
        //                         new Paragraph({
        //                             alignment: AlignmentType.RIGHT, // ← center horizontally
        //                             children: [
        //                                 new ImageRun({
        //                                     data: leftLogoData,
        //                                     transformation: { width: 80, height: 80 },
        //                                 }),
        //                             ],
        //                             spacing: { before: 0, after: 0 }, // remove extra spacing
        //                         }),
        //                     ],
        //                     margins: { top: 0, bottom: 0, left: 0, right: 0 }, // reduce padding
        //                     borders: { top: { style: "NONE" }, bottom: { style: "NONE" }, left: { style: "NONE" }, right: { style: "NONE" } },
        //                 }),

        //                 // Center Text
        //                 new TableCell({
        //                     width: { size: 10, type: WidthType.PERCENTAGE },
        //                     verticalAlign: AlignmentType.CENTER,
        //                     children: [
        //                         new Paragraph({ children: [new TextRun({ text: "Republic of the Philippines", bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
        //                         new Paragraph({ children: [new TextRun({ text: "Province of Nueva Vizcaya", bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
        //                         new Paragraph({ children: [new TextRun({ text: "MUNICIPALITY OF BAYOMBONG", bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
        //                         new Paragraph({ children: [new TextRun({ text: "BARANGAY BONFAL PROPER", bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
        //                     ],
        //                     margins: { top: 0, bottom: 0, left: 0, right: 0 },
        //                     borders: { top: { style: "NONE" }, bottom: { style: "NONE" }, left: { style: "NONE" }, right: { style: "NONE" } },
        //                 }),

        //                 // Right Logo
        //                 new TableCell({
        //                     width: { size: 15, type: WidthType.PERCENTAGE },
        //                     verticalAlign: AlignmentType.CENTER,
        //                     children: [
        //                         new Paragraph({
        //                             alignment: AlignmentType.LEFT, // ← center horizontally
        //                             children: [
        //                                 new ImageRun({
        //                                     data: rightLogoData,
        //                                     transformation: { width: 80, height: 80 },
        //                                 }),
        //                             ],
        //                             spacing: { before: 0, after: 0 },
        //                         }),
        //                     ],
        //                     margins: { top: 0, bottom: 0, left: 0, right: 0 },
        //                     borders: { top: { style: "NONE" }, bottom: { style: "NONE" }, left: { style: "NONE" }, right: { style: "NONE" } },
        //                 }),
        //             ],
        //         }),

        //     ],
        //     borders: { top: { style: "NONE" }, bottom: { style: "NONE" }, left: { style: "NONE" }, right: { style: "NONE" } },
        // });

        const doc = new Document({
            sections: [
                {
                    properties: { page: { size: { orientation: "landscape" } } },
                    children: [
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [new TextRun({ text: "VIOLENCE AGAINST WOMEN AND CHILDREN (VAWC) MONITORING CHART 2025", size: 22})],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [new TextRun({ text: "R.A. 9262", size: 22 })],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({ text: "" }),
                        table,
                    ],
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "Abuse_Summary_Report.docx");
    } catch (err) {
        console.error("DOCX generation failed:", err);
    }
}
