import React, { useState } from "react";
import Tesseract from "tesseract.js";
import toast from "react-hot-toast";
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { X, User, Upload, Scan, Loader2, Check, IndianRupee, Divide } from 'lucide-react';
import api from '../api/axios';

const BillScannerModal = ({ group, onClose, onSuccess }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [divisionMethod, setDivisionMethod] = useState('even'); // 'even', 'exclude', 'custom'
  const [excludedMembers, setExcludedMembers] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setBillData(null);
      setError('');
    }
  };

  const handleScan = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // OCR with Tesseract
      const { data } = await Tesseract.recognize(image, "eng");

      // Analyze with AI
      const response = await api.post('/bill/analyze', { text: data.text });

      setBillData(response.data.data);
      
      // Initialize custom amounts for each item
      const initialCustomAmounts = {};
      response.data.data.items.forEach((item, index) => {
        group.members.forEach(member => {
          initialCustomAmounts[`${index}-${member._id}`] = '';
        });
      });
      setCustomAmounts(initialCustomAmounts);

    } catch (error) {
      console.error('Scan error:', error);
      setError(error.response?.data?.message || 'Failed to scan bill');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMember = (itemIndex, memberId) => {
    const updated = [...billData.items];
    const item = updated[itemIndex];

    if (!item.assignedTo) {
      item.assignedTo = [];
    }

    if (item.assignedTo.includes(memberId)) {
      item.assignedTo = item.assignedTo.filter(m => m !== memberId);
    } else {
      item.assignedTo.push(memberId);
    }

    item.isShared = false;
    setBillData({ ...billData, items: updated });
  };

  const handleShared = (itemIndex) => {
    const updated = [...billData.items];
    updated[itemIndex].isShared = !updated[itemIndex].isShared;
    updated[itemIndex].assignedTo = [];
    setBillData({ ...billData, items: updated });
  };

  const calculateSplit = () => {
    if (!billData) return null;

    const memberBalances = {};
    group.members.forEach(member => {
      memberBalances[member._id] = 0;
    });

    billData.items.forEach(item => {
      if (item.isShared) {
        // Split evenly among all members
        const perPerson = parseFloat(item.price) / group.members.length;
        group.members.forEach(member => {
          memberBalances[member._id] += perPerson;
        });
      } else if (item.assignedTo && item.assignedTo.length > 0) {
        // Split among assigned members
        const perPerson = parseFloat(item.price) / item.assignedTo.length;
        item.assignedTo.forEach(memberId => {
          memberBalances[memberId] += perPerson;
        });
      }
    });

    return memberBalances;
  };

  const handleProcessPayment = async () => {
    if (!billData) {
      setError('No bill data to process');
      return;
    }

    // Validate that all items are assigned
    const unassignedItems = billData.items.filter(
      item => !item.isShared && (!item.assignedTo || item.assignedTo.length === 0)
    );

    if (unassignedItems.length > 0) {
      setError('Please assign all items to members or mark them as shared');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const memberBalances = calculateSplit();

      // Prepare expense data
      const expenseData = {
        amount: parseFloat(billData.total),
        description: `Bill from ${billData.vendor || 'Scanned Bill'}`,
        divisionMethod: 'custom',
        customAmounts: memberBalances,
        items: billData.items,
        vendor: billData.vendor
      };

      // Process payment via API
      const response = await api.post(
        `/groups/${group._id}/process-payment`,
        expenseData,
        { withCredentials: true }
      );

      // Show success toast
      toast.success('Expense added successfully! 🎉');

      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (err) {
      console.error('Error processing payment:', err);
      const errorMessage = err.response?.data?.message || 'Failed to process payment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const splitBalances = calculateSplit();
  const totalAmount = billData?.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl bg-gray-900 border-gray-700 my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-emerald-400" />
              <CardTitle>Scan Bill & Split</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <CardDescription>
            Upload a bill image, scan it with AI, and split among group members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          {!billData && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center space-y-4">
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Bill preview"
                      className="max-h-80 mx-auto rounded-lg object-contain"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImage(null);
                          setPreview(null);
                        }}
                        className="border-gray-600"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                      <Button
                        onClick={handleScan}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Scan className="w-4 h-4 mr-2" />
                            Scan with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      className="hidden"
                    />
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">Upload Bill Image</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Click to browse or drag and drop
                        </p>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Bill Data Display */}
          {billData && (
            <div className="space-y-6">
              {/* Bill Header */}
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <h3 className="font-semibold text-lg mb-2">{billData.vendor || 'Vendor'}</h3>
                <p className="text-emerald-400 text-2xl font-bold">
                  Total: ₹{totalAmount.toFixed(2)}
                </p>
              </div>

              {/* Items Assignment */}
              <div className="space-y-3">
                <Label className="text-base">Assign Items to Members</Label>
                {billData.items.map((item, index) => (
                  <div key={index} className="border border-gray-700 p-4 rounded-xl space-y-3 bg-gray-800/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-emerald-400 font-bold">₹{Number(item.price).toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={item.isShared ? "default" : "outline"}
                        onClick={() => handleShared(index)}
                        className={item.isShared ? "bg-blue-600 hover:bg-blue-700" : "border-gray-600"}
                      >
                        {item.isShared ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Shared by All
                          </>
                        ) : (
                          'Mark as Shared'
                        )}
                      </Button>
                    </div>

                    {!item.isShared && (
                      <div className="flex gap-2 flex-wrap">
                        {group.members.map(member => (
                          <Button
                            key={member._id}
                            size="sm"
                            variant={item.assignedTo?.includes(member._id) ? "default" : "outline"}
                            onClick={() => handleAssignToMember(index, member._id)}
                            className={
                              item.assignedTo?.includes(member._id)
                                ? "bg-emerald-600 hover:bg-emerald-700 text-black"
                                : "border-gray-600"
                            }
                          >
                            {member.username || member.email}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Split Summary */}
              {splitBalances && (
                <div className="p-4 bg-gray-800/50 rounded-xl space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Divide className="w-4 h-4" />
                    Split Summary
                  </h4>
                  <div className="space-y-2">
                    {group.members.map(member => (
                      <div key={member._id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{member.username || member.email}</span>
                        <span className="font-semibold text-emerald-400">
                          ₹{splitBalances[member._id].toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBillData(null);
                    setPreview(null);
                    setImage(null);
                  }}
                  className="flex-1 border-gray-600"
                  disabled={processing}
                >
                  Scan New Bill
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={processing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Payment'
                  )}
                </Button>
              </div>
            </div>
          )}

          {error && !billData && (
            <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!billData && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillScannerModal;
