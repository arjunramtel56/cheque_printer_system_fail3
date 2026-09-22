import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";
import { TemplateFieldConfig } from "@/types";

interface ChequePDFProps {
  bankName: string;
  chequeWidth: number;
  chequeHeight: number;
  backgroundUrl?: string | null;
  fields: Record<string, string>;
  templateFields: TemplateFieldConfig[];
}

const MM_TO_PT = 1;

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
          {fieldPositions.map((field) => {
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
  const chequeWidth = template?.chequeWidth || 210;
  const chequeHeight = template?.chequeHeight || 90;
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
