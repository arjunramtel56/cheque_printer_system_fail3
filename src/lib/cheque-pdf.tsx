import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";
import { TemplateFieldConfig } from "@/types";
import { CHEQUE, CROSSING_CENTER_Y_MM, FIELD_POSITIONS } from "@/lib/cheque/constants";

interface ChequePDFProps {
  bankName: string;
  chequeWidth: number;
  chequeHeight: number;
  backgroundUrl?: string | null;
  fields: Record<string, string>;
  templateFields: TemplateFieldConfig[];
}

/** Width of one date digit box in mm (8 boxes spanning the date row). */
const DATE_BOX_W_MM = FIELD_POSITIONS.date.w / FIELD_POSITIONS.date.boxes;

export const ChequePDFDocument = (props: ChequePDFProps) => {
  const { bankName, chequeWidth, chequeHeight, backgroundUrl, fields, templateFields } = props;

  const fieldPositions = templateFields || [];

  return (
    <Document>
      <Page style={[styles.page, { width: chequeWidth, height: chequeHeight }]} wrap={false}>
        <View
          style={{
            position: "relative",
            width: chequeWidth,
            height: chequeHeight,
            borderWidth: 1,
            borderColor: "#000000",
            padding: 0,
          }}
        >
          {backgroundUrl && (
            <Image
              src={backgroundUrl}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 1,
              }}
            />
          )}

          {/* A/C PAYEE ONLY — horizontal band centred on the date line */}
          <View
            style={{
              position: "absolute",
              top: CROSSING_CENTER_Y_MM - 3.5,
              left: 0,
              width: chequeWidth,
              height: 7,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
            wrap={false}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Courier",
                fontWeight: "bold",
                letterSpacing: 2,
                color: "#000000",
                borderStyle: "solid",
                borderWidth: 1,
                borderColor: "#000000",
                paddingHorizontal: 8,
                paddingVertical: 1,
              }}
            >
              {"A/C PAYEE ONLY"}
            </Text>
          </View>

          {/* Date: eight individual DDMMYYYY digit boxes, top right */}
          <View
            style={{
              position: "absolute",
              left: FIELD_POSITIONS.date.x,
              top: FIELD_POSITIONS.date.y,
              width: FIELD_POSITIONS.date.w,
              height: FIELD_POSITIONS.date.h,
              flexDirection: "row",
              zIndex: 5,
            }}
            wrap={false}
          >
            {Array.from({ length: FIELD_POSITIONS.date.boxes }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: DATE_BOX_W_MM,
                  height: FIELD_POSITIONS.date.h,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontFamily: "Courier",
                    fontWeight: "bold",
                    color: "#000000",
                  }}
                >
                  {fields.date ? (fields.date.replace(/\D/g, "")[i] ?? "") : ""}
                </Text>
              </View>
            ))}
          </View>

          {fieldPositions.map((field) => {
            // Date + amount figure are rendered by the dedicated blocks above
            // (digit boxes / amount box) for print parity.
            if (field.field === "date" || field.field === "amountNumber") return null;

            const value = fields[field.field] || "";
            return (
              <Text
                key={field.id || field.field}
                style={{
                  position: "absolute",
                  left: `${field.x}mm`,
                  top: `${field.y}mm`,
                  fontSize: field.fontSize || 12,
                  fontFamily: field.fontFamily || "Helvetica",
                  fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                  color: field.color || "#000000",
                  textAlign: field.align || "left",
                  width: field.width ? `${field.width}mm` : "auto",
                  transform: field.rotation ? `rotate(${field.rotation}deg)` : undefined,
                }}
              >
                {value}
              </Text>
            );
          })}

          {/* Amount box on the right of the beneficiary line */}
          <View
            style={{
              position: "absolute",
              left: FIELD_POSITIONS.amountFig.x,
              top: FIELD_POSITIONS.amountFig.y,
              width: FIELD_POSITIONS.amountFig.w,
              height: FIELD_POSITIONS.amountFig.h,
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: "#000000",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingRight: 6,
              zIndex: 5,
            }}
            wrap={false}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Courier",
                fontWeight: "bold",
                color: "#000000",
              }}
            >
              {fields.amountNumber || ""}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 0,
    margin: 0,
  },
} as any);

export async function generateChequePDF(
  cheque: any,
  fields: Record<string, string>
): Promise<Buffer> {
  const template = cheque.template;
  const bankName = template?.bank?.name || "Bank Cheque";
  const chequeWidth = template?.chequeWidth || CHEQUE.WIDTH_MM;
  const chequeHeight = template?.chequeHeight || CHEQUE.HEIGHT_MM;
  const backgroundUrl = template?.backgroundUrl || null;
  const templateFields = (template?.fields || []).map((f: any) => ({
    id: f.id,
    field: f.field,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    fontSize: f.fontSize || 12,
    fontFamily: f.fontFamily || "Arial",
    fontWeight: f.fontWeight || "normal",
    letterSpacing: f.letterSpacing,
    align: (f.align || "left") as "left" | "center" | "right",
    rotation: f.rotation,
    color: f.color || "#000000",
    format: f.format,
  }));

  const doc = React.createElement(ChequePDFDocument, {
    bankName,
    chequeWidth,
    chequeHeight,
    backgroundUrl,
    fields,
    templateFields,
  } as ChequePDFProps);

  const blob = await pdf(doc as any).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
