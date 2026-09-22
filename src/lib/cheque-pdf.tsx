import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf, PDFDownloadLink } from "@react-pdf/renderer";

interface ChequePDFProps {
  bankName: string;
  fields: Record<string, string>;
}

export const ChequePDFDocument = (props: ChequePDFProps) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.cheque}>
        <Text style={styles.bankName}>{props.bankName}</Text>
        <Text style={styles.sectionTitle}>Pay to the order of:</Text>
        <Text style={styles.payee}>{props.fields.payee || "________________"}</Text>
        <Text style={styles.amountWords}>{props.fields.amountWords || "________________"}</Text>
        <Text style={styles.amountNumber}>Rs. {props.fields.amountNumber}</Text>
        <Text style={styles.date}>Date: {props.fields.date || "__/__/____"}</Text>
        <Text style={styles.accountHolder}>Account: {props.fields.name || "________________"}</Text>
      </View>
    </Page>
  </Document>
);

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  cheque: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 30,
    justifyContent: "space-between",
  },
  bankName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    marginBottom: 10,
  },
  payee: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 20,
  },
  amountWords: {
    fontSize: 10,
    marginBottom: 10,
  },
  amountNumber: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 20,
  },
  date: {
    fontSize: 10,
    marginTop: "auto",
  },
  accountHolder: {
    fontSize: 10,
  },
});

export async function generateChequePDF(
  cheque: any,
  fields: Record<string, string>
): Promise<Buffer> {
  const doc = React.createElement(ChequePDFDocument, {
    bankName: cheque.template.bank.name,
    fields,
  } as ChequePDFProps);

  const blob = await pdf(doc as any).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
