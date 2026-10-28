import os
import io
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from app.core.config import settings

class ReportGenerator:
    @classmethod
    def generate_pdf_report(cls, verification_data: Dict[str, Any]) -> bytes:
        """
        Builds a comprehensive, professional compliance PDF report from actual verification findings.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]

        # Custom typography styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#14213D"),
            fontName="Helvetica-Bold"
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748B"),
            fontName="Helvetica"
        )
        section_style = ParagraphStyle(
            "SectionTitle",
            parent=styles["Heading2"],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#14213D"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6
        )
        badge_style = ParagraphStyle(
            "StatusBadge",
            parent=styles["Normal"],
            fontSize=12,
            leading=16,
            textColor=colors.white,
            fontName="Helvetica-Bold",
            alignment=1
        )
        table_cell = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica"
        )
        table_header = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#14213D"),
            fontName="Helvetica-Bold"
        )
        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#475569"),
            fontName="Helvetica-Oblique"
        )

        elements = []

        # 1. Header with branding
        elements.append(Paragraph("VERIDOC AI — DOCUMENT VERIFICATION AUDIT REPORT", title_style))
        elements.append(Paragraph(f"Autonomous Compliance Engine | Reference ID: {verification_data.get('reference_id')}", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceBefore=2, spaceAfter=12))

        # 2. Executive Status Box
        final_status = str(verification_data.get("final_status", "UNKNOWN"))
        bg_color = colors.HexColor("#15803D") # green
        if "INVALID" in final_status:
            bg_color = colors.HexColor("#B91C1C") # red
        elif "REVIEW" in final_status:
            bg_color = colors.HexColor("#B45309") # amber
        elif "UNABLE" in final_status:
            bg_color = colors.HexColor("#475569") # dark gray

        status_table = Table(
            [[Paragraph(f"FINAL AUDIT VERDICT: {final_status.upper()}", badge_style)]],
            colWidths=[540],
            rowHeights=[30]
        )
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(status_table)
        elements.append(Spacer(1, 10))

        # 3. Document Details Metadata Grid
        details_data = [
            [
                Paragraph("<b>Reference ID:</b>", table_cell),
                Paragraph(str(verification_data.get("reference_id")), table_cell),
                Paragraph("<b>Document Category:</b>", table_cell),
                Paragraph(str(verification_data.get("document_type", "")).replace("_", " ").title(), table_cell),
            ],
            [
                Paragraph("<b>Original Filename:</b>", table_cell),
                Paragraph(str(verification_data.get("original_filename")), table_cell),
                Paragraph("<b>Processing Date:</b>", table_cell),
                Paragraph(str(verification_data.get("created_at", datetime.now().isoformat()))[:19].replace("T", " "), table_cell),
            ],
            [
                Paragraph("<b>Passed Checks:</b>", table_cell),
                Paragraph(f"<font color='#15803D'><b>{verification_data.get('passed_checks_count', 0)} checks passed</b></font>", table_cell),
                Paragraph("<b>Failed / Warnings:</b>", table_cell),
                Paragraph(f"<font color='#B91C1C'><b>{verification_data.get('failed_checks_count', 0)} failed</b></font> / {verification_data.get('warning_checks_count', 0)} warnings", table_cell),
            ]
        ]
        details_table = Table(details_data, colWidths=[110, 160, 110, 160])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 10))

        # 4. Summary description
        summary_text = verification_data.get("summary", "Document verification completed.")
        elements.append(Paragraph("<b>Executive Summary:</b> " + summary_text, table_cell))
        elements.append(Spacer(1, 10))

        # 5. Extracted Fields Table
        fields = verification_data.get("extracted_fields", [])
        if fields:
            elements.append(Paragraph("Extracted & Normalized Entity Fields", section_style))
            field_rows = [[
                Paragraph("Field Name", table_header),
                Paragraph("Normalized / Masked Value", table_header),
                Paragraph("Confidence", table_header)
            ]]
            for f in fields:
                val = str(f.get("normalized_value") or f.get("raw_value") or "N/A")
                conf = f.get("extraction_confidence", 1.0)
                field_rows.append([
                    Paragraph(f.get("field_name", "").replace("_", " ").title(), table_cell),
                    Paragraph(val, table_cell),
                    Paragraph(f"{int(conf * 100)}%", table_cell)
                ])

            field_table = Table(field_rows, colWidths=[160, 300, 80])
            field_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(field_table)
            elements.append(Spacer(1, 10))

        # 6. Detailed Verification Checks Table
        checks = verification_data.get("checks", [])
        if checks:
            elements.append(Paragraph("Verification Rule Evaluation Checklist", section_style))
            check_rows = [[
                Paragraph("Rule / Inspection Check", table_header),
                Paragraph("Result", table_header),
                Paragraph("Severity", table_header),
                Paragraph("Audit Findings & Evidence", table_header)
            ]]
            for c in checks:
                res_str = c.get("result", "INFO")
                sev_str = c.get("severity", "INFO")
                res_color = "#15803D" if res_str == "PASSED" else ("#B91C1C" if res_str == "FAILED" else "#B45309")
                
                check_rows.append([
                    Paragraph(c.get("check_name", ""), table_cell),
                    Paragraph(f"<font color='{res_color}'><b>{res_str}</b></font>", table_cell),
                    Paragraph(sev_str, table_cell),
                    Paragraph(f"{c.get('explanation', '')}<br/><font color='#64748B'>Ref: {c.get('evidence_reference', 'N/A')}</font>", table_cell)
                ])

            check_table = Table(check_rows, colWidths=[150, 55, 55, 280])
            check_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(check_table)
            elements.append(Spacer(1, 14))

        # 7. Recommendations & Legal Disclaimer
        elements.append(Paragraph("Recommended Compliance Actions", section_style))
        for rec in verification_data.get("recommended_next_steps", []):
            elements.append(Paragraph(f"• {rec}", table_cell))
        elements.append(Spacer(1, 10))

        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceBefore=4, spaceAfter=8))
        disclaimer = (
            "IMPORTANT STATUTORY DISCLAIMER: This report is generated by the VeriDoc AI autonomous document verification system. "
            "Automated document integrity analysis, structural layout checks, mathematical checksums, and optical character recognition "
            "do not constitute official government authentication or an issuer-certified digital seal. Format and available fields "
            "were validated against public technical rules. Official legal validity requires direct queries to authorized government identity authorities."
        )
        elements.append(Paragraph(disclaimer, disclaimer_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
