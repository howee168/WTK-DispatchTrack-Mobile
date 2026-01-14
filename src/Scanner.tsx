// src/Scanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { X, Truck, Package, Plus, CheckCircle, Trash2, FileText, MapPinned, Barcode, Hash, CalendarDays, Info, AlertCircle, ZoomIn, ZoomOut, XCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
// 1. IMPORT THE MANIPULATOR
import * as ImageManipulator from 'expo-image-manipulator'; 
import { Order, ScanAction } from './types';

type ScanState = 'IDLE' | 'ACTION_SELECT' | 'CHECKLIST' | 'TRUCK_SELECT' | 'PHOTO_PROOF' | 'SIGNATURE' | 'SUCCESS' | 'ERROR';

interface ScannerProps {
  trucks: any[];
  orders: Order[];
  onScan: (orderId: string, action: ScanAction, isMatch: boolean, truckId?: string, proofImages?: string[], gps?: string, signature?: string) => void;
  goBack: () => void;
}

export default function Scanner({ trucks, orders, onScan, goBack }: ScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();

  const [zoom, setZoom] = useState(0);
  const [facing, setFacing] = useState<CameraType>('back');

  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [scanned, setScanned] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [selectedAction, setSelectedAction] = useState<ScanAction | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [manualInput, setManualInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const resetScanner = () => {
    setScanState('IDLE');
    setScannedOrder(null);
    setSelectedAction(null);
    setSelectedTruckId('');
    setProofImages([]);
    setSignature('');
    setCheckedItems(new Set());
    setFeedbackMessage('');
    setManualInput('');
    setScanned(false);
  };

  useEffect(() => {
    if (scanState === 'SUCCESS' || scanState === 'ERROR') {
      const timer = setTimeout(() => {
        resetScanner();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanState]);

  const handleBarCodeScanned = ({ data }: any) => {
    if (scanned) return;
    setScanned(true);
    handleScan(data);
  };

  const handleScan = (code: string) => {
    const order = orders.find(o => o.id.trim().toUpperCase() === code.trim().toUpperCase());
    
    if (!order) {
      setScanState('ERROR');
      setFeedbackMessage(`Order "${code}" not found.`);
      return;
    }

    setScannedOrder(order);
    setScanState('ACTION_SELECT');
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
    setManualInput('');
  };

  const handleActionSelect = (action: ScanAction) => {
    setSelectedAction(action);
    setScanState('CHECKLIST');
  };

  const handleChecklistComplete = () => {
    if (selectedAction === 'LOAD') {
      setScanState('TRUCK_SELECT');
    } else {
      setScanState('PHOTO_PROOF');
    }
  };

  const toggleItemCheck = (index: number) => {
    const newSet = new Set(checkedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setCheckedItems(newSet);
  };

  const handleTruckSelect = (truckId: string) => {
    if (!scannedOrder) return;
    
    setSelectedTruckId(truckId);

    if (scannedOrder.expectedTruckId !== truckId) {
      setScanState('ERROR');
      const correctTruck = trucks.find(t => t.id === scannedOrder.expectedTruckId);
      setFeedbackMessage(`WRONG TRUCK! Goes to ${correctTruck?.name || scannedOrder.expectedTruckId}`);
      onScan(scannedOrder.id, 'LOAD', false, truckId);
      return;
    }
    
    setScanState('PHOTO_PROOF');
  };

  // --- UPDATED PHOTO FUNCTION WITH COMPRESSION ---
  const takePhoto = async () => {
    // 1. Launch Camera normally
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, // Take high quality first
      base64: false, // Don't ask for base64 (too heavy), we will use URI
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // 2. Compress and Resize
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1024 } }], // Resize width to 1024px (height adjusts auto)
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
        );

        // 3. Save the new Compressed URI
        // This file is now ~150KB instead of 5MB
        setProofImages([...proofImages, manipulatedImage.uri]);

      } catch (error) {
        console.log("Compression Error:", error);
        // Fallback: use original if compression fails
        setProofImages([...proofImages, result.assets[0].uri]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoComplete = () => {
    setScanState('SIGNATURE');
  };

  const handleSignatureComplete = () => {
    if (!scannedOrder || !selectedAction) return;

    const mockGPS = "3.1390° N, 101.6869° E";

    onScan(
      scannedOrder.id,
      selectedAction,
      true,
      selectedAction === 'LOAD' ? selectedTruckId : undefined,
      proofImages.length > 0 ? proofImages : undefined,
      mockGPS,
      signature
    );

    setFeedbackMessage(`${selectedAction} Complete!`);
    setScanState('SUCCESS');
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 1));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0));
  
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-800 mb-4">We need your camera permission</Text>
        <TouchableOpacity onPress={requestPermission} className="bg-brand-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // IDLE - Scanner Screen
  if (scanState === 'IDLE') {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing={facing}
          zoom={zoom}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        
        {/* Dark overlay */}
        <View className="absolute inset-0 bg-black/60" />
        
        {/* Top Badge: LIVE SCANNER */}
        <View className="absolute top-12 left-6 flex-row items-center bg-slate-800/90 px-4 py-2 rounded-full border border-slate-700 z-10">
          <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          <Text className="text-white font-bold text-sm tracking-wide">LIVE SCANNER</Text>
        </View>
        
        {/* Back Button */}
        <TouchableOpacity onPress={goBack} className="absolute top-12 right-6 p-2 bg-black/60 rounded-full z-10">
          <X color="white" size={24}/>
        </TouchableOpacity>

        {/* Right Side: Zoom Controls */}
        <View className="absolute right-3 top-1/2 -mt-16 bg-black/50 rounded-full py-2 items-center space-y-2 z-20">
            <TouchableOpacity onPress={handleZoomIn} className="p-3">
                <ZoomIn color="white" size={24} />
            </TouchableOpacity>
            <View className="w-8 h-[1px] bg-white/30" />
            <TouchableOpacity onPress={handleZoomOut} className="p-3">
                <ZoomOut color="white" size={24} />
            </TouchableOpacity>
        </View>
        
        {/* Scanner Frame */}
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 10 }]} pointerEvents="none">
          <View className="w-72 h-72 relative">
            <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-brand-500 rounded-tl-3xl" />
            <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-brand-500 rounded-tr-3xl" />
            <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-brand-500 rounded-bl-3xl" />
            <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-brand-500 rounded-br-3xl" />
          </View>
        </View>
        
        {/* Manual Entry Section */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="absolute bottom-0 left-0 right-0 z-20"
        >
          <View className="bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-6 px-6">
            <Text className="text-white font-semibold text-sm mb-3 text-center">OR ENTER MANUALLY</Text>
            
            <View className="flex-row gap-2">
              <TextInput
                value={manualInput}
                onChangeText={setManualInput}
                placeholder="Type Job ID (e.g. JOB-KL-001)"
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-white/10 border border-white/20 text-white px-4 py-4 rounded-xl"
                style={{ color: '#fff' }}
                onSubmitEditing={handleManualScan}
                returnKeyType="go"
              />
              <TouchableOpacity 
                onPress={handleManualScan}
                disabled={!manualInput.trim()}
                className={`bg-brand-600 px-6 py-4 rounded-xl ${!manualInput.trim() ? 'opacity-50' : ''}`}
              >
                <Text className="text-white font-bold">GO</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              onPress={() => {
                const random = orders[Math.floor(Math.random() * orders.length)];
                if (random) handleScan(random.id);
              }}
              className="items-center mt-4"
            >
              <Text className="text-white/60 underline text-sm">Simulate Scan</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </KeyboardAvoidingView>
    );
  }

  // ACTION_SELECT - Show Order Details and Action Buttons
  if (scanState === 'ACTION_SELECT' && scannedOrder) {
    const truck = trucks.find(t => t.id === scannedOrder.expectedTruckId);

    return (
      <View className="flex-1 bg-slate-50">
        <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row justify-between items-center shadow-sm">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 bg-green-500 rounded-full" />
            <Text className="font-bold text-slate-800">Scan Successful</Text>
          </View>
          <TouchableOpacity onPress={resetScanner} className="p-2">
            <X size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className={`px-6 py-4 flex-row justify-between items-center ${
            scannedOrder.status === 'LOADED' ? 'bg-orange-100 border-b border-orange-200' :
            scannedOrder.status === 'PICKED_UP' ? 'bg-blue-100 border-b border-blue-200' :
            'bg-slate-100 border-b border-slate-200'
          }`}>
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider opacity-60">Status</Text>
              <Text className={`text-lg font-black ${
                scannedOrder.status === 'LOADED' ? 'text-orange-800' :
                scannedOrder.status === 'PICKED_UP' ? 'text-blue-800' :
                'text-slate-600'
              }`}>
                {scannedOrder.status.replace('_', ' ')}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-bold uppercase tracking-wider opacity-60">Last Scan</Text>
              <Text className="text-sm font-medium text-slate-700">
                {scannedOrder.lastScannedBy || 'N/A'}
              </Text>
            </View>
          </View>

          <View className="p-4 space-y-4">
            <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <View className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex-row justify-between items-center">
                <Text className="text-xs font-bold uppercase text-slate-500">Order & Job Info</Text>
                <View className={`px-2 py-0.5 rounded-full border ${
                  scannedOrder.priority === 'Urgent' ? 'bg-red-50 border-red-100' : 
                  scannedOrder.priority === 'Low' ? 'bg-green-50 border-green-100' : 
                  'bg-blue-50 border-blue-100'
                }`}>
                  <Text className={`text-[10px] font-bold ${
                    scannedOrder.priority === 'Urgent' ? 'text-red-700' : 
                    scannedOrder.priority === 'Low' ? 'text-green-700' : 
                    'text-blue-700'
                  }`}>
                    {scannedOrder.priority || 'Standard'}
                  </Text>
                </View>
              </View>
              <View className="p-4">
                <View className="flex-row items-start gap-3 mb-3">
                  <FileText size={20} color="#94a3b8" />
                  <View>
                    <Text className="text-xs text-slate-500">Job ID</Text>
                    <Text className="font-mono font-bold text-slate-800">{scannedOrder.id}</Text>
                  </View>
                </View>
                <View className="flex-row items-start gap-3">
                  <MapPinned size={20} color="#94a3b8" />
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500">Customer & Destination</Text>
                    <Text className="font-bold text-slate-900 leading-tight">{scannedOrder.hospitalName}</Text>
                    <Text className="text-xs text-slate-500 mt-1">{scannedOrder.address || 'Address not specified'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <View className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                <Text className="text-xs font-bold uppercase text-slate-500">Logistics</Text>
              </View>
              <View className="p-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs text-slate-500 mb-1">Assigned Vehicle</Text>
                  {truck ? (
                    <View>
                      <Text className="font-bold text-slate-800 text-lg">{truck.name}</Text>
                      <Text className="text-xs text-slate-400 font-mono">{scannedOrder.expectedTruckId}</Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <AlertCircle size={16} color="#f97316" />
                      <Text className="font-bold text-orange-600">Not Assigned</Text>
                    </View>
                  )}
                </View>
                <View className={`p-3 rounded-full ${truck?.color || 'bg-slate-100'}`}>
                  <Truck size={24} color={truck ? '#0088CC' : '#94a3b8'} />
                </View>
              </View>
            </View>

            <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <View className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex-row justify-between items-center">
                <Text className="text-xs font-bold uppercase text-slate-500">Packing List</Text>
                <Text className="text-xs font-bold text-slate-400">{scannedOrder.items.length} Items</Text>
              </View>
              <View>
                {scannedOrder.items.map((item, idx) => (
                  <View key={idx} className="p-4 border-b border-slate-100 last:border-b-0">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="font-bold text-slate-800">{item.name}</Text>
                        <Text className="text-xs text-slate-500">{item.description || 'No description'}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-black text-slate-800">{item.qty}</Text>
                        <Text className="text-[10px] text-slate-500 uppercase">{item.uom || 'Unit'}</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row flex-wrap gap-2 mt-3 bg-slate-50 p-2 rounded-lg">
                      <View className="flex-1 min-w-[45%]">
                        <View className="flex-row items-center gap-1 mb-0.5">
                          <Barcode size={12} color="#94a3b8" />
                          <Text className="text-[10px] uppercase text-slate-400 font-bold">SKU</Text>
                        </View>
                        <Text className="text-xs font-mono text-slate-700">{item.sku || '-'}</Text>
                      </View>
                      <View className="flex-1 min-w-[45%]">
                        <View className="flex-row items-center gap-1 mb-0.5">
                          <Hash size={12} color="#94a3b8" />
                          <Text className="text-[10px] uppercase text-slate-400 font-bold">Batch</Text>
                        </View>
                        <Text className="text-xs font-mono text-slate-700">{item.batchNumber || '-'}</Text>
                      </View>
                      <View className="flex-1 min-w-[45%]">
                        <View className="flex-row items-center gap-1 mb-0.5">
                          <CalendarDays size={12} color="#94a3b8" />
                          <Text className="text-[10px] uppercase text-slate-400 font-bold">Expiry</Text>
                        </View>
                        <Text className="text-xs text-slate-700">{item.expiryDate || '-'}</Text>
                      </View>
                      <View className="flex-1 min-w-[45%]">
                        <View className="flex-row items-center gap-1 mb-0.5">
                          <Info size={12} color="#94a3b8" />
                          <Text className="text-[10px] uppercase text-slate-400 font-bold">Serial</Text>
                        </View>
                        <Text className="text-xs font-mono text-slate-700">{item.serialNumber || '-'}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {scannedOrder.proofImages && scannedOrder.proofImages.length > 0 && (
              <View className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <View className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <Text className="text-xs font-bold uppercase text-slate-500">Previous Photos</Text>
                </View>
                <View className="p-4">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {scannedOrder.proofImages.map((img, i) => (
                        <Image key={i} source={{ uri: img }} className="w-16 h-16 rounded-lg border border-slate-200" />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        
        <View className="p-4 bg-white border-t border-slate-200 shadow-lg flex-row gap-3">
          <TouchableOpacity 
            onPress={() => handleActionSelect('PICKUP')}
            className="flex-1 bg-blue-50 border border-blue-200 py-4 rounded-xl items-center"
          >
            <Package size={24} color="#2563eb" />
            <Text className="text-blue-700 font-bold mt-1">PICK UP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleActionSelect('LOAD')}
            className="flex-1 bg-brand-600 py-4 rounded-xl items-center shadow-lg"
          >
            <Truck size={24} color="white" />
            <Text className="text-white font-bold mt-1">LOAD TRUCK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // CHECKLIST - Verify Items
  if (scanState === 'CHECKLIST' && scannedOrder) {
    const allChecked = scannedOrder.items.length === checkedItems.size;

    return (
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-bold text-slate-800 mb-2">Check Items</Text>
          <Text className="text-slate-500 mb-6">Verify all items are present before proceeding.</Text>

          <View className="space-y-3">
            {scannedOrder.items.map((item, index) => {
              const isChecked = checkedItems.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleItemCheck(index)}
                  className={`p-4 rounded-xl border flex-row items-center justify-between ${
                    isChecked 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <View className="flex-1">
                    <Text className={`font-bold ${isChecked ? 'text-green-800' : 'text-slate-800'}`}>{item.name}</Text>
                    <Text className="text-xs text-slate-500">Qty: {item.qty} {item.uom}</Text>
                    {item.sku && <Text className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</Text>}
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isChecked 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-slate-300'
                  }`}>
                    {isChecked && <CheckCircle size={16} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-4 bg-white border-t border-slate-200">
          <TouchableOpacity 
            onPress={handleChecklistComplete}
            disabled={!allChecked}
            className={`w-full py-4 rounded-xl font-bold text-white ${
              allChecked ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <Text className="text-center text-white font-bold">
              {allChecked ? 'Confirm & Continue' : `Verify Items (${checkedItems.size}/${scannedOrder.items.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // TRUCK_SELECT
  if (scanState === 'TRUCK_SELECT') {
    return (
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-bold text-slate-800 mb-2">Select Truck</Text>
          <Text className="text-slate-500 mb-6">Which truck is this going onto?</Text>
          <View className="space-y-3">
            {trucks.map(truck => (
              <TouchableOpacity
                key={truck.id}
                onPress={() => handleTruckSelect(truck.id)}
                className="w-full p-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between"
              >
                <Text className="font-bold text-slate-700">{truck.name}</Text>
                <Truck size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        <View className="p-4 bg-white border-t border-slate-200">
          <TouchableOpacity onPress={() => setScanState('ACTION_SELECT')} className="w-full py-4">
            <Text className="text-slate-400 font-bold text-center">Back to Action</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // PHOTO_PROOF
  if (scanState === 'PHOTO_PROOF') {
    return (
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-bold text-slate-800 mb-2">Photo Proof</Text>
          <Text className="text-slate-500 mb-6">Take photos to prove {selectedAction?.toLowerCase().replace('_', ' ')} status.</Text>
          
          <View className="flex-row flex-wrap gap-3 mb-4">
            {proofImages.map((img, idx) => (
              <View key={idx} className="relative w-[48%] aspect-square rounded-xl overflow-hidden border border-slate-200">
                <Image source={{ uri: img }} className="w-full h-full" />
                <TouchableOpacity 
                  onPress={() => removePhoto(idx)}
                  className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full"
                >
                  <Trash2 size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity 
              onPress={takePhoto}
              className="w-[48%] aspect-square rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 items-center justify-center"
            >
              <Plus size={32} color="#0088CC" />
              <Text className="text-xs font-bold text-brand-600 mt-1">Add Photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View className="p-4 bg-white border-t border-slate-200">
          <TouchableOpacity 
            onPress={handlePhotoComplete}
            disabled={proofImages.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-white ${
              proofImages.length > 0 ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <Text className="text-center text-white font-bold">Continue to Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SIGNATURE
  if (scanState === 'SIGNATURE') {
    return (
      <View className="flex-1 bg-slate-50">
        <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
          <Text className="text-xl font-bold text-slate-800 mb-2">Sign Off</Text>
          <Text className="text-slate-500 mb-6">Digital signature required for chain of custody.</Text>
          
          <View className="bg-white rounded-xl border border-slate-300 p-4 items-center justify-center h-64 mb-4">
            <Text className="text-slate-400">Signature pad would go here</Text>
            <Text className="text-xs text-slate-400 mt-2">(Signature library integration needed)</Text>
            <TouchableOpacity 
              onPress={() => setSignature('signed')}
              className="mt-4 bg-brand-600 px-6 py-2 rounded-lg"
            >
              <Text className="text-white font-bold">Mark as Signed</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View className="p-4 bg-white border-t border-slate-200">
          <TouchableOpacity 
            onPress={handleSignatureComplete}
            disabled={!signature}
            className={`w-full py-4 rounded-xl font-bold text-white ${
              signature ? 'bg-brand-600' : 'bg-slate-300'
            }`}
          >
            <Text className="text-center text-white font-bold">Submit Final</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SUCCESS/ERROR States
  return (
    <View className={`flex-1 items-center justify-center p-6 ${
      scanState === 'ERROR' ? 'bg-red-600' : 'bg-green-600'
    }`}>
      {scanState === 'SUCCESS' ? (
        <>
          <CheckCircle size={128} color="white" />
          <Text className="text-4xl font-extrabold text-white mb-2 mt-4">UPDATED</Text>
          <Text className="text-white/90 text-lg">{feedbackMessage}</Text>
        </>
      ) : (
        <>
          <XCircle size={128} color="white" />
          <Text className="text-4xl font-extrabold text-white mb-2 mt-4">ERROR</Text>
          <Text className="text-white/90 text-lg bg-black/20 p-4 rounded-xl">{feedbackMessage}</Text>
        </>
      )}
    </View>
  );
}