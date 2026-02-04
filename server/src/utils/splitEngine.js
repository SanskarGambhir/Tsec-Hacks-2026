export const calculateSplit = (items, members) => {
  const balances = {};

  members.forEach(member => {
    balances[member] = 0;
  });

  items.forEach(item => {
    const price = Number(item.price) || 0;

    if (item.isShared) {
      const splitAmount = price / members.length;

      members.forEach(member => {
        balances[member] += splitAmount;
      });

    } else if (item.assignedTo && item.assignedTo.length > 0) {
      const splitAmount = price / item.assignedTo.length;

      item.assignedTo.forEach(member => {
        balances[member] += splitAmount;
      });
    }
  });

  Object.keys(balances).forEach(member => {
    balances[member] = Number(balances[member].toFixed(2));
  });

  return balances;
};
