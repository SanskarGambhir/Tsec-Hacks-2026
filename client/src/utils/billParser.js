export const parseBillText = (text) => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let total = null;
  let date = null;
  let vendor = lines[0] || "Unknown Vendor";

  // Find total
  const totalRegex = /(total|amount|grand total)[^0-9]*([0-9]+(\.[0-9]{2})?)/i;
  for (let line of lines) {
    const match = line.match(totalRegex);
    if (match) {
      total = match[2];
      break;
    }
  }

  // Find date
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/;
  for (let line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      date = match[0];
      break;
    }
  }

  return {
    vendor,
    total,
    date
  };
};
     