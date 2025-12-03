import {
    Table,
    TableRow,
    TableCell,
    Paragraph,
    TextRun,
    WidthType,
    VerticalAlign,
    AlignmentType
} from "docx";

const ABUSE_TYPES = [
    "SEXUAL",
    "PHYSICAL",
    "PSYCHOLOGICAL",
    "ECONOMIC",
    "OTHER VIOLATIONS"
];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function buildAbuseDocxTable(summary, totalRow) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [

            // 🔵 Row 1 — MONTHS merged across 12 columns
            new TableRow({
                children: [
                    new TableCell({
                        rowSpan: 2,
                        width: { size: 18, type: WidthType.PERCENTAGE },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: "Nature of Abuse", bold: true, size: 22 })
                            ]
                        })],
                        verticalAlign: VerticalAlign.CENTER,
                    }),

                    // MONTHS header merged
                    new TableCell({
                        columnSpan: 12,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "MONTHS", bold: true, size: 22 })]
                            })
                        ]
                    }),

                    new TableCell({
                        rowSpan: 2,
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: "Remarks", bold: true, size: 22 })
                            ]
                        })]
                    }),
                ]
            }),

            // 🔵 Row 2 — J F M A M J J A S O N D
            new TableRow({
                children: MONTHS.map(m =>
                    new TableCell({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: m, bold: true, size: 22 })],
                            })
                        ]
                    })
                )
            }),

            ...ABUSE_TYPES.map(type =>
                new TableRow({
                    children: [
                        // Nature of Abuse
                        new TableCell({
                            children: [new Paragraph(type)],
                        }),

                        // 12 months of counts (default to 0 if missing)
                        ...((summary[type] || Array(12).fill(0)).map(v =>
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun(String(v), { size: 22 })],
                                    })
                                ]
                            })
                        )),

                        // Remarks (blank for now)
                        new TableCell({
                            children: [new Paragraph("")],
                        }),
                    ]
                })
            ),

            // 🔵 Total Row (only if totalRow is defined)
            ...(totalRow
                ? [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true, size: 22 })] })]
                            }),

                            ...totalRow.map(v =>
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [new TextRun(String(v), { size: 22 })],
                                        })
                                    ]
                                })
                            ),

                            new TableCell({ children: [new Paragraph("")] }), // remarks
                        ]
                    })
                ]
                : []
            ),
        ]
    });
}
