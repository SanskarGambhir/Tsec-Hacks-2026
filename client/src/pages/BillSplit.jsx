import { useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillSplit() {

  const members = ["Rahul", "Alex", "Sarah"];

  const [items, setItems] = useState([
    { name: "Pizza", price: 400, assignedTo: [], isShared: false },
    { name: "Pasta", price: 300, assignedTo: [], isShared: false },
    { name: "Coke", price: 200, assignedTo: [], isShared: false },
  ]);

  const [balances, setBalances] = useState(null);

  const handleAssign = (index, value) => {
    const updated = [...items];
    updated[index].assignedTo = value;
    updated[index].isShared = false;
    setItems(updated);
  };

  const toggleShared = (index) => {
    const updated = [...items];
    updated[index].isShared = !updated[index].isShared;
    updated[index].assignedTo = [];
    setItems(updated);
  };

  const handleCalculate = async () => {
    const res = await axios.post(
      "http://localhost:8000/api/v1/bill/split",
      { items, members }
    );

    setBalances(res.data.balances);
  };

  return (
    <div className="space-y-6">

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle>Bill Item Assignment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {items.map((item, index) => (
            <div key={index} className="bg-white/5 p-4 rounded-xl">

              <div className="flex justify-between mb-3">
                <span className="font-semibold">{item.name}</span>
                <span className="text-emerald-400">₹{item.price}</span>
              </div>

              <div className="space-y-2">

                <select
                  multiple
                  value={item.assignedTo}
                  disabled={item.isShared}
                  onChange={(e) =>
                    handleAssign(
                      index,
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="w-full p-2 rounded bg-black/40 border border-white/10"
                >
                  {members.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={item.isShared}
                    onChange={() => toggleShared(index)}
                  />
                  Shared among all
                </label>

              </div>
            </div>
          ))}

          <button
            onClick={handleCalculate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-black font-semibold"
          >
            Calculate Split
          </button>

        </CardContent>
      </Card>

      {balances && (
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle>Split Result</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {Object.entries(balances).map(([member, amount]) => (
              <div
                key={member}
                className="flex justify-between p-3 bg-white/5 rounded-xl"
              >
                <span>{member}</span>
                <span className="text-emerald-400 font-semibold">
                  ₹{amount}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
