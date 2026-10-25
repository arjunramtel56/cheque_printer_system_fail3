"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ChequeDemo() {
  const cheques = useQuery(api.cheques.getCheques);
  const createCheque = useMutation(api.cheques.createCheque);

  const handleAddCheque = async () => {
    await createCheque({
      payeeName: "Ramesh Sharma",
      amount: 25000,
      bankName: "NIC Asia Bank",
    });
  };

  return (
    <div>
      <button onClick={handleAddCheque}>Navin Cheque Joda</button>
      <ul>
        {cheques?.map((cheque) => (
          <li key={cheque._id}>
            {cheque.payeeName} - Rs. {cheque.amount} ({cheque.bankName})
          </li>
        ))}
      </ul>
    </div>
  );
}
