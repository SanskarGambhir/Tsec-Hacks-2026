import React from "react";
import { X, User, Calendar, DollarSign, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const ExpenseDetailsModal = ({ expense, group, onClose }) => {
  if (!expense) return null;

  const categoryColors = {
    Accommodation: "bg-primary/20 text-primary",
    Food: "bg-orange-500/20 text-orange-400",
    Activities: "bg-purple-500/20 text-purple-400",
    Transport: "bg-primary/10 text-primary",
    General: "bg-secondary text-muted-foreground",
  };

  // Get the user who paid for this expense
  const paidByUser = group?.members?.find(
    (m) => m._id === expense.paidBy || m._id === expense.spentBy
  );

  // Convert memberCharges Map to array for display
  const memberChargesArray = expense.memberCharges
    ? Object.entries(expense.memberCharges).map(([userId, amount]) => {
        const member = group?.members?.find((m) => m._id === userId);
        return {
          userId,
          amount,
          member,
        };
      })
    : [];

  // If no memberCharges, calculate equal split
  const hasDetailedSplit = memberChargesArray.length > 0;
  const equalSplitAmount = !hasDetailedSplit
    ? expense.amount / (group?.members?.length || 1)
    : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <Card className="border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-xl flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Expense Details
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {expense.description}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {expense.category && (
                    <Badge
                      className={`${categoryColors[expense.category] || categoryColors.General}`}
                    >
                      {expense.category}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="border-border text-foreground"
                  >
                    {expense.divisionMethod === "even"
                      ? "Split Evenly"
                      : expense.divisionMethod === "custom"
                        ? "Custom Split"
                        : expense.divisionMethod === "exclude"
                          ? "Partial Members"
                          : "Regular Split"}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">
                  ₹{expense.amount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Total Amount</p>
              </div>
            </div>

            {/* Date and Paid By */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(expense.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {paidByUser && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                  <User className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Paid By</p>
                    <p className="font-medium truncate">
                      {paidByUser.username || paidByUser.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Member Split Details */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Split Breakdown
            </h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {hasDetailedSplit ? (
                // Show detailed member charges
                memberChargesArray.map(({ userId, amount, member }) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member?.email || userId}`}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-foreground text-sm">
                          {member
                            ? (member.username || member.email)[0].toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member?.username || member?.email || "Unknown User"}
                        </p>
                        {member?.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-primary">
                        ₹{Number(amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((Number(amount) / expense.amount) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                // Show equal split for all members
                group?.members?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-foreground text-sm">
                          {(member.username || member.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.username || member.email}
                        </p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-primary">
                        ₹{equalSplitAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((equalSplitAmount / expense.amount) * 100).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Split among {hasDetailedSplit ? memberChargesArray.length : group?.members?.length || 0}{" "}
                member
                {(hasDetailedSplit ? memberChargesArray.length : group?.members?.length || 0) !== 1
                  ? "s"
                  : ""}
              </span>
              <span>
                Average: ₹
                {hasDetailedSplit
                  ? (
                      memberChargesArray.reduce(
                        (sum, { amount }) => sum + Number(amount),
                        0,
                      ) / memberChargesArray.length
                    ).toFixed(2)
                  : equalSplitAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseDetailsModal;
