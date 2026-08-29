import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import connectDB from "./db/index.js";
import { User } from "./models/user.models.js";
import { UserWallet } from "./models/wallet.models.js";
import { GroupWallet } from "./models/groupWallet.models.js";
import { Group } from "./models/group.models.js";
import { Friend } from "./models/friend.models.js";
import { Transaction } from "./models/transactions.models.js";
import { GroupInvite } from "./models/groupInvite.models.js";
import { PhoneInvite } from "./models/phoneInvite.models.js";
import { SharedExpense } from "./models/sharedExpense.models.js";
import { CreditWithdrawal } from "./models/creditWithdrawal.models.js";

/**
 * Demo data for cooper@gmail.com.
 *
 * Inserts documents through the Mongoose models directly rather than hitting
 * the HTTP API, so it does not depend on Twilio OTP or SMTP actually firing —
 * a seed script has no business needing live third-party credentials. Pass
 * --reset to wipe the previous run of this script before re-seeding.
 *
 *   node src/seed.js [--reset]
 */

const DEMO_PASSWORD = "123456";
const DEMO_EMAIL = "cooper@gmail.com";

const FRIEND_SEEDS = [
  { username: "aarav_mehta", email: "aarav.demo@gmail.com", phone: "+919811100001", pan: "AAAPM1234A" },
  { username: "diya_kapoor", email: "diya.demo@gmail.com", phone: "+919811100002", pan: "BBBPK5678B" },
  { username: "rohan_iyer", email: "rohan.demo@gmail.com", phone: "+919811100003", pan: "CCCPI9012C" },
  { username: "sara_nair", email: "sara.demo@gmail.com", phone: "+919811100004", pan: "DDDPN3456D" },
  { username: "kabir_singh", email: "kabir.demo@gmail.com", phone: "+919811100005", pan: "EEEPS7890E" },
];

const SEED_EMAILS = [DEMO_EMAIL, ...FRIEND_SEEDS.map((f) => f.email)];

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function reset() {
  const users = await User.find({ email: { $in: SEED_EMAILS } }).select("_id");
  const userIds = users.map((u) => u._id);

  const groups = await Group.find({ owner: { $in: userIds } }).select("_id");
  const groupIds = groups.map((g) => g._id);

  await Promise.all([
    GroupWallet.deleteMany({ group: { $in: groupIds } }),
    Group.deleteMany({ _id: { $in: groupIds } }),
    Friend.deleteMany({ $or: [{ requester: { $in: userIds } }, { recipient: { $in: userIds } }] }),
    Transaction.deleteMany({ user: { $in: userIds } }),
    GroupInvite.deleteMany({ $or: [{ sender: { $in: userIds } }, { recipient: { $in: userIds } }] }),
    PhoneInvite.deleteMany({ sender: { $in: userIds } }),
    SharedExpense.deleteMany({ creator: { $in: userIds } }),
    CreditWithdrawal.deleteMany({ member: { $in: userIds } }),
    UserWallet.deleteMany({ user: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);

  console.log(`Cleared ${userIds.length} seed user(s) and their data.`);
}

async function createUser({ username, email, phone, pan }) {
  const panCardHash = User.hashPan(pan);

  const user = await User.create({
    username,
    email,
    phone,
    password: DEMO_PASSWORD,
    panCardHash,
    panCardLast4: pan.slice(-4),
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const wallet = await UserWallet.create({ user: user._id, balance: 0, status: "ACTIVE" });
  return { user, wallet };
}

async function fundWallet(wallet, amount, description) {
  wallet.balance += amount;
  await wallet.save();

  await Transaction.create({
    user: wallet.user,
    wallet: wallet._id,
    scope: "USER",
    intentId: `SEED_FUND_${wallet._id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "DEPOSIT",
    amount,
    currency: "INR",
    status: "COMPLETED",
    paymentStatus: "SUCCESS",
    description,
  });
}

/** Move money from a member's wallet into their share of a group pool. */
async function contribute(groupWallet, userWallet, amount, description) {
  userWallet.balance -= amount;
  await userWallet.save();

  groupWallet.balance += amount;
  const existing = groupWallet.memberBalances.find(
    (mb) => mb.user.toString() === userWallet.user.toString()
  );
  if (existing) existing.balance += amount;
  else groupWallet.memberBalances.push({ user: userWallet.user, balance: amount });

  groupWallet.transactions.push({
    fromUser: userWallet.user,
    amount,
    type: "DEPOSIT",
    description,
  });
  await groupWallet.save();

  await Transaction.create({
    user: userWallet.user,
    wallet: userWallet._id,
    scope: "USER",
    intentId: `SEED_GROUP_${groupWallet._id}_${userWallet.user}_${Date.now()}`,
    type: "GROUP_DEPOSIT",
    amount,
    currency: "INR",
    status: "COMPLETED",
    paymentStatus: "SUCCESS",
    description,
  });
}

/** Charge an expense evenly across the members who were charged. */
function chargeEvenly(groupWallet, members, amount) {
  const share = Math.round((amount / members.length) * 100) / 100;
  const memberCharges = {};

  members.forEach((userId) => {
    const entry = groupWallet.memberBalances.find((mb) => mb.user.toString() === userId.toString());
    if (entry) entry.balance -= share;
    memberCharges[userId.toString()] = share;
  });

  groupWallet.balance -= share * members.length;
  return memberCharges;
}

async function seed() {
  await connectDB();

  if (process.argv.includes("--reset")) {
    await reset();
  }

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    console.log(
      `${DEMO_EMAIL} already exists. Re-run with --reset to wipe and recreate the demo data.`
    );
    await mongoose.disconnect();
    return;
  }

  console.log("Creating demo account and friends...");

  const { user: cooper, wallet: cooperWallet } = await createUser({
    username: "cooper_demo",
    email: DEMO_EMAIL,
    phone: "+919800000000",
    pan: "ZZZPC0000Z",
  });

  const friends = [];
  for (const seed of FRIEND_SEEDS) {
    friends.push(await createUser(seed));
  }
  const [aarav, diya, rohan, sara, kabir] = friends;

  // Starting balances, so the demo has money to move around immediately.
  await fundWallet(cooperWallet, 25000, "Demo seed: initial top-up");
  await fundWallet(aarav.wallet, 15000, "Demo seed: initial top-up");
  await fundWallet(diya.wallet, 12000, "Demo seed: initial top-up");
  await fundWallet(rohan.wallet, 9000, "Demo seed: initial top-up");
  await fundWallet(sara.wallet, 18000, "Demo seed: initial top-up");
  await fundWallet(kabir.wallet, 6000, "Demo seed: initial top-up");

  console.log("Wiring up the friend graph...");

  // Four accepted friendships and one still pending, so the Friends page has
  // both a list and a request badge to show.
  await Friend.create({ requester: cooper._id, recipient: aarav.user._id, status: "accepted" });
  await Friend.create({ requester: diya.user._id, recipient: cooper._id, status: "accepted" });
  await Friend.create({ requester: cooper._id, recipient: rohan.user._id, status: "accepted" });
  await Friend.create({ requester: cooper._id, recipient: sara.user._id, status: "accepted" });
  await Friend.create({ requester: kabir.user._id, recipient: cooper._id, status: "pending" });

  // Friends among themselves, so the friend graph is not a pure star.
  await Friend.create({ requester: aarav.user._id, recipient: diya.user._id, status: "accepted" });
  await Friend.create({ requester: rohan.user._id, recipient: sara.user._id, status: "accepted" });

  console.log("Building groups...");

  /* ---------------- Goa Trip: pooling, instant release ---------------- */
  const goa = await Group.create({
    name: "Goa Trip 2026",
    description: "December beach trip — flights, stay, and everything in between",
    ruleType: "pooling",
    releaseType: "instant",
    owner: cooper._id,
    members: [cooper._id, aarav.user._id, diya.user._id, rohan.user._id],
    rules: [
      { ruleType: "pool", ruleValue: "Pool-based group", description: "Money is collected in a shared pool" },
      { ruleType: "approval_required", ruleValue: "20%", description: "Expenses over 20% of the pool need another member's approval" },
    ],
  });

  const goaWallet = await GroupWallet.create({ group: goa._id, balance: 0, currency: "INR" });

  await contribute(goaWallet, cooperWallet, 6000, "Initial pool contribution");
  await contribute(goaWallet, aarav.wallet, 6000, "Joined group with contribution");
  await contribute(goaWallet, diya.wallet, 6000, "Joined group with contribution");
  await contribute(goaWallet, rohan.wallet, 6000, "Joined group with contribution");

  const flightCharges = chargeEvenly(goaWallet, goa.members, 8000);
  goaWallet.transactions.push({
    fromUser: cooper._id,
    amount: 8000,
    type: "GROUP_PAYMENT",
    description: "Flight tickets (IndiGo)",
    memberCharges: flightCharges,
  });

  const stayCharges = chargeEvenly(goaWallet, goa.members, 6400);
  goaWallet.transactions.push({
    fromUser: aarav.user._id,
    amount: 6400,
    type: "GROUP_PAYMENT",
    description: "Villa booking — 3 nights",
    memberCharges: stayCharges,
  });
  await goaWallet.save();

  goa.wallet = goaWallet._id;
  goa.pool = goaWallet.balance;
  goa.expenses.push(
    {
      amount: 8000,
      description: "Flight tickets (IndiGo)",
      spentBy: cooper._id,
      paidBy: cooper._id,
      date: daysAgo(6),
      category: "Transport",
      divisionMethod: "even",
      memberCharges: flightCharges,
    },
    {
      amount: 6400,
      description: "Villa booking — 3 nights",
      spentBy: aarav.user._id,
      paidBy: aarav.user._id,
      date: daysAgo(4),
      category: "Accommodation",
      divisionMethod: "even",
      memberCharges: stayCharges,
    }
  );
  goa.messages.push(
    { content: "Excited for this trip!! 🌴", sender: cooper._id, timestamp: daysAgo(7) },
    { content: "Booked the flights, check your share in the wallet", sender: cooper._id, timestamp: daysAgo(6) },
    { content: "Villa's confirmed, beachfront 🔥", sender: aarav.user._id, timestamp: daysAgo(4) },
    { content: "Can't wait!", sender: diya.user._id, timestamp: daysAgo(4) }
  );
  await goa.save();

  /* ---------------- Flatmates: splitwise, instant ---------------- */
  const flat = await Group.create({
    name: "Flatmates — HSR Layout",
    description: "Monthly shared expenses for the flat",
    ruleType: "splitwise",
    releaseType: "instant",
    owner: cooper._id,
    members: [cooper._id, sara.user._id, kabir.user._id],
    rules: [
      { ruleType: "regular_split", ruleValue: "Expense splitting", description: "Expenses are split between flatmates and settled up" },
    ],
  });

  const flatWallet = await GroupWallet.create({ group: flat._id, balance: 0, currency: "INR" });

  await contribute(flatWallet, cooperWallet, 3000, "Monthly contribution");
  await contribute(flatWallet, sara.wallet, 3000, "Monthly contribution");
  await contribute(flatWallet, kabir.wallet, 3000, "Monthly contribution");

  const groceryCharges = chargeEvenly(flatWallet, flat.members, 2700);
  flatWallet.transactions.push({
    fromUser: sara.user._id,
    amount: 2700,
    type: "GROUP_PAYMENT",
    description: "Groceries for the month",
    memberCharges: groceryCharges,
  });

  // A custom split: Kabir didn't use the WiFi upgrade, so he isn't charged.
  const wifiCharges = { [cooper._id.toString()]: 750, [sara.user._id.toString()]: 750 };
  const wifiEntryCooper = flatWallet.memberBalances.find((mb) => mb.user.toString() === cooper._id.toString());
  const wifiEntrySara = flatWallet.memberBalances.find((mb) => mb.user.toString() === sara.user._id.toString());
  if (wifiEntryCooper) wifiEntryCooper.balance -= 750;
  if (wifiEntrySara) wifiEntrySara.balance -= 750;
  flatWallet.balance -= 1500;
  flatWallet.transactions.push({
    fromUser: cooper._id,
    amount: 1500,
    type: "GROUP_PAYMENT",
    description: "WiFi router upgrade (excluding Kabir)",
    memberCharges: wifiCharges,
  });
  await flatWallet.save();

  flat.wallet = flatWallet._id;
  flat.pool = flatWallet.balance;
  flat.expenses.push(
    {
      amount: 2700,
      description: "Groceries for the month",
      spentBy: sara.user._id,
      paidBy: sara.user._id,
      date: daysAgo(10),
      category: "Food",
      divisionMethod: "even",
      memberCharges: groceryCharges,
    },
    {
      amount: 1500,
      description: "WiFi router upgrade (excluding Kabir)",
      spentBy: cooper._id,
      paidBy: cooper._id,
      date: daysAgo(3),
      category: "General",
      divisionMethod: "exclude",
      memberCharges: wifiCharges,
    }
  );
  flat.messages.push(
    { content: "Rent's due on the 5th, don't forget", sender: cooper._id, timestamp: daysAgo(12) },
    { content: "Bought groceries, added to the group", sender: sara.user._id, timestamp: daysAgo(10) },
    { content: "New router is so much faster", sender: cooper._id, timestamp: daysAgo(3) }
  );
  await flat.save();

  /* ---------------- Office Farewell: milestone ---------------- */
  const farewell = await Group.create({
    name: "Priya's Farewell Gift",
    description: "Collecting for a group gift before she leaves",
    ruleType: "pooling",
    releaseType: "milestone",
    owner: cooper._id,
    members: [cooper._id, aarav.user._id, rohan.user._id, sara.user._id],
    milestones: [
      { title: "Gift fund target", description: "Enough for a nice gift + card", targetAmount: 8000, currentAmount: 0, isCompleted: false },
    ],
    rules: [
      { ruleType: "pool", ruleValue: "Pool-based group", description: "Money is collected in a shared pool" },
    ],
  });

  const farewellWallet = await GroupWallet.create({ group: farewell._id, balance: 0, currency: "INR" });

  await contribute(farewellWallet, cooperWallet, 2000, "Gift fund contribution");
  await contribute(farewellWallet, aarav.wallet, 2000, "Gift fund contribution");
  await contribute(farewellWallet, rohan.wallet, 1500, "Gift fund contribution");

  farewell.wallet = farewellWallet._id;
  farewell.milestones[0].currentAmount = farewellWallet.balance;
  farewell.pool = farewellWallet.balance;
  farewell.messages.push(
    { content: "Let's get her something nice 🎁", sender: cooper._id, timestamp: daysAgo(2) },
    { content: "In for 2000", sender: aarav.user._id, timestamp: daysAgo(2) }
  );
  await farewell.save();

  /* ---------------- Community Fund: time-locked ---------------- */
  const fund = await Group.create({
    name: "Diwali Community Fund",
    description: "Locked until Diwali for decorations and events",
    ruleType: "pooling",
    releaseType: "time_locked",
    unlockDate: daysFromNow(20),
    isLocked: true,
    owner: cooper._id,
    members: [cooper._id, diya.user._id, kabir.user._id],
    rules: [
      { ruleType: "pool", ruleValue: "Pool-based group", description: "Money is collected in a shared pool" },
    ],
  });

  const fundWalletDoc = await GroupWallet.create({ group: fund._id, balance: 0, currency: "INR" });
  await contribute(fundWalletDoc, cooperWallet, 1000, "Diwali fund contribution");
  await contribute(fundWalletDoc, diya.wallet, 1000, "Diwali fund contribution");

  fund.wallet = fundWalletDoc._id;
  fund.pool = fundWalletDoc.balance;
  fund.messages.push({
    content: "Locked until Diwali so nobody's tempted to dip in early 😄",
    sender: cooper._id,
    timestamp: daysAgo(1),
  });
  await fund.save();

  console.log("Adding invites, a credit withdrawal, and a shared expense link...");

  // A pending group invite waiting on a signup, and a pending phone invite —
  // both common states to show off on the invites screen.
  await GroupInvite.create({
    group: goa._id,
    sender: cooper._id,
    inviteType: "friend",
    recipient: null,
    token: GroupInvite.generateInviteToken(),
    status: "pending",
  });

  await PhoneInvite.create({
    sender: cooper._id,
    phoneNumber: "+919999999999",
    token: PhoneInvite.generateInviteToken(),
    status: "pending",
  });

  // A settled credit withdrawal, for the activity feed and profile stats.
  await CreditWithdrawal.create({
    group: goa._id,
    member: cooper._id,
    amount: 500,
    status: "settled",
    settledAt: daysAgo(1),
    description: "Withdrew unused share after a cancelled excursion",
  });

  // A public shared-expense link, independent of any group.
  const dinnerTotal = 2400;
  await SharedExpense.create({
    title: "Team dinner at The Clay Oven",
    description: "Split across everyone who showed up",
    totalAmount: dinnerTotal,
    participants: [
      { name: "Cooper", sharePercentage: 40, shareAmount: dinnerTotal * 0.4 },
      { name: "Aarav", sharePercentage: 30, shareAmount: dinnerTotal * 0.3 },
      { name: "Diya", sharePercentage: 30, shareAmount: dinnerTotal * 0.3 },
    ],
    creator: cooper._id,
    creatorName: cooper.username,
    creatorEmail: cooper.email,
    shareLink: "demo-team-dinner-2026",
  });

  console.log("\nDone. Demo account:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(`  wallet balance: ₹${(await UserWallet.findOne({ user: cooper._id })).balance}`);
  console.log(`  groups: ${goa.name}, ${flat.name}, ${farewell.name}, ${fund.name}`);
  console.log(`  friends: ${FRIEND_SEEDS.map((f) => f.username).join(", ")}`);
  console.log(`  shared expense link: /shared-expense/demo-team-dinner-2026`);

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
