import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Printer, Clock, Plus, X, MapPin, Truck as TruckIcon, Trash2, Package, Eye, PenTool } from 'lucide-react-native';
import { Order, OrderStatus, Truck, BoxItem } from './types';
import * as Print from 'expo-print';

interface DashboardProps {
  orders: Order[];
  trucks: Truck[];
  onAddOrder?: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export default function Dashboard({ orders, trucks, onAddOrder, onDeleteOrder }: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProofData, setSelectedProofData] = useState<{images: string[], signature?: string} | null>(null);
  
  // Form State
  const [hospitalName, setHospitalName] = useState('');
  const [expectedTruckId, setExpectedTruckId] = useState('');
  const [items, setItems] = useState<BoxItem[]>([{ name: '', qty: 1 }]);
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  // Set default truck when modal opens
  useEffect(() => {
    if (isModalOpen && !expectedTruckId && trucks.length > 0) {
      setExpectedTruckId(trucks[0].id);
    }
  }, [isModalOpen, trucks]);

  const handleAddItem = () => {
    setItems([...items, { name: '', qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof BoxItem, value: string | number) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!hospitalName || !expectedTruckId || items.every(i => !i.name.trim())) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const validItems = items.filter(i => i.name.trim() !== '');
    const randomId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;

    const order: Order = {
      id: randomId,
      hospitalName: hospitalName,
      expectedTruckId: expectedTruckId,
      status: OrderStatus.CREATED,
      items: validItems
    };

    if (onAddOrder) {
      onAddOrder(order);
    }
    setIsModalOpen(false);
    
    // Reset form
    setHospitalName('');
    setItems([{ name: '', qty: 1 }]);
    setExpectedTruckId(trucks[0]?.id || '');
  };

  const handlePrint = async (order: Order) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${order.id}`;
    const truckName = trucks.find(t => t.id === order.expectedTruckId)?.name || 'Unassigned';
    
    const html = `
      <html>
        <head>
          <title>Job Sheet - ${order.id}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; border: 4px solid #000; margin: 10px; }
            h1 { font-size: 20px; margin-bottom: 5px; }
            h2 { font-size: 28px; font-weight: 900; margin: 10px 0; }
            .box-info { margin: 20px 0; border: 2px solid #000; padding: 15px; text-align: left; }
            .items { text-align: left; font-size: 14px; margin-top: 20px; }
            img { margin: 10px auto; display: block; border: 1px solid #eee; }
            .footer { font-size: 12px; margin-top: 40px; font-weight: bold;}
          </style>
        </head>
        <body>
          <h1>DISPATCH TRACKER</h1>
          <h2>${truckName}</h2>
          <img src="${qrUrl}" width="200" height="200" />
          <div class="box-info">
            <p><strong>JOB ID:</strong> ${order.id}</p>
            <p><strong>DESTINATION:</strong><br/>${order.hospitalName}</p>
          </div>
          <div class="items">
            <strong>CONTENTS:</strong>
            <ul>
              ${order.items.map(item => `<li>${item.qty} x ${item.name}</li>`).join('')}
            </ul>
          </div>
          <div class="footer">SCAN AT: WAREHOUSE > TRUCK</div>
        </body>
      </html>
    `;
    
    try {
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Error', 'Failed to print label');
    }
  };

  const handleDelete = (orderId: string) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            if (onDeleteOrder) {
              onDeleteOrder(orderId);
            }
          }
        }
      ]
    );
  };

  // Status Badge Helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.LOADED:
        return (
          <View className="flex-row items-center bg-orange-100 px-2 py-1 rounded-full">
            <TruckIcon size={12} color="#9a3412" />
            <Text className="text-orange-800 text-xs font-bold ml-1">IN TRANSIT</Text>
          </View>
        );
      case OrderStatus.PICKED_UP:
        return (
          <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded-full">
            <Package size={12} color="#1e40af" />
            <Text className="text-blue-800 text-xs font-bold ml-1">WAREHOUSE</Text>
          </View>
        );
      default:
        return (
          <View className="flex-row items-center bg-slate-100 px-2 py-1 rounded-full">
            <Clock size={12} color="#64748b" />
            <Text className="text-slate-500 text-xs font-bold ml-1">CREATED</Text>
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-6 pb-4">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Live Status Board</Text>
        <Text className="text-slate-500 mt-1 text-base">Real-time tracking of all active job orders.</Text>
      </View>

      {/* Create Job Order Button */}
      <View className="px-5 mb-4">
        <TouchableOpacity 
          onPress={() => setIsModalOpen(true)}
          className="bg-brand-600 py-4 rounded-xl flex-row items-center justify-center shadow-lg elevation-5"
        >
          <Plus color="white" size={24} strokeWidth={3} />
          <Text className="text-white font-bold text-lg ml-2">Create Job Order</Text>
        </TouchableOpacity>
      </View>

      {/* List of Orders */}
      <FlatList 
        data={orders}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const truck = trucks.find(t => t.id === item.expectedTruckId);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.id}`;

          return (
            <View className="bg-white p-5 rounded-2xl mb-5 shadow-sm border border-slate-100 elevation-2">
              
              {/* Card Header */}
              <View className="flex-row justify-between items-start mb-3">
                {getStatusBadge(item.status)}
                <Text className="text-xs font-mono font-bold text-slate-300">{item.id}</Text>
              </View>
              
              {/* Hospital Name */}
              <Text className="text-xl font-bold text-slate-800 leading-6 mb-2">{item.hospitalName}</Text>
              
              {/* Truck Info */}
              <View className="flex-row items-center mb-4">
                <TruckIcon size={16} color="#94a3b8" />
                <Text className="text-sm text-slate-500 ml-2 font-medium">{truck?.name || item.expectedTruckId}</Text>
              </View>

              {/* QR and Proof Images */}
              <View className="flex-row mb-4" style={{ gap: 16 }}>
                {/* QR Code */}
                <Image 
                  source={{ uri: qrUrl }}
                  style={{ width: 80, height: 80, borderRadius: 8 }}
                />
                
                {/* Proof Image Preview */}
                <View className="flex-1">
                  {item.proofImages && item.proofImages.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => setSelectedProofData({images: item.proofImages!, signature: item.signature})}
                      className="w-full h-20 rounded-lg overflow-hidden border border-slate-200 relative"
                    >
                      <Image 
                        source={{ uri: item.proofImages[0] }} 
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-black/30 items-center justify-center">
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                          <Eye size={16} color="white" />
                          <Text className="text-white text-xs font-bold">View</Text>
                        </View>
                      </View>
                      {item.proofImages.length > 1 && (
                        <View className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded-full">
                          <Text className="text-white text-[10px] font-bold">+{item.proofImages.length - 1}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full h-20 bg-slate-50 rounded-lg items-center justify-center border border-dashed border-slate-200">
                      <Text className="text-[10px] font-bold text-slate-300">NO PROOF</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Items List */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-400 uppercase mb-2">Contents</Text>
                <View className="bg-slate-50 rounded-xl p-3 border border-dashed border-slate-200">
                  {item.items.slice(0, 3).map((item, idx) => (
                    <View key={idx} className="flex-row justify-between mb-1">
                      <Text className="text-xs text-slate-600 font-medium flex-1" numberOfLines={1}>{item.name}</Text>
                      <Text className="text-xs text-slate-400 font-mono">x{item.qty}</Text>
                    </View>
                  ))}
                  {item.items.length > 3 && (
                    <Text className="text-[10px] text-slate-400 italic mt-1">+{item.items.length - 3} more items...</Text>
                  )}
                </View>
              </View>

              {/* Footer */}
              <View className="pt-4 border-t border-slate-100 flex-row justify-between items-center">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {onDeleteOrder && (
                    <TouchableOpacity 
                      onPress={() => handleDelete(item.id)}
                      className="p-2"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  <View>
                    {item.lastScannedBy ? (
                      <Text className="text-xs text-slate-500">
                        Last: <Text className="font-bold text-slate-700">{item.lastScannedBy}</Text>
                      </Text>
                    ) : (
                      <Text className="text-xs text-slate-400">Not scanned yet</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => handlePrint(item)}
                  className="flex-row items-center bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm"
                >
                  <Printer size={14} color="#0088CC" />
                  <Text className="text-xs font-bold text-brand-600 ml-2">Print Label</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* New Job Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <View className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-xl font-bold text-slate-800">New Job Order</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              <View>
                {/* Hospital Name */}
                <View className="mb-6">
                  <Text className="text-xs font-bold uppercase text-slate-500 mb-2">Project / Destination</Text>
                  <View className="flex-row items-center bg-white border border-slate-300 rounded-lg px-3">
                    <MapPin size={16} color="#94a3b8" />
                    <TextInput
                      placeholder="e.g. General Hospital KL - OT Room 3"
                      value={hospitalName}
                      onChangeText={setHospitalName}
                      className="flex-1 ml-2 py-2 text-slate-900"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Truck Selection */}
                <View className="mb-6">
                  <Text className="text-xs font-bold uppercase text-slate-500 mb-2">Assign Truck</Text>
                  <TouchableOpacity
                    onPress={() => setShowTruckPicker(true)}
                    className="flex-row items-center bg-white border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <TruckIcon size={16} color="#94a3b8" />
                    <Text className="flex-1 ml-2 text-slate-900">
                      {trucks.find(t => t.id === expectedTruckId)?.name || 'Select truck...'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items List */}
                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-bold uppercase text-slate-500">Items List</Text>
                    <TouchableOpacity onPress={handleAddItem} className="flex-row items-center">
                      <Plus size={16} color="#0088CC" />
                      <Text className="text-brand-600 text-xs font-bold ml-1">Add Item</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView className="bg-slate-50 rounded-xl p-3 border border-slate-100 max-h-48">
                    {items.map((item, index) => (
                      <View key={index} className="flex-row mb-2" style={{ gap: 8 }}>
                        <TextInput
                          value={item.qty.toString()}
                          onChangeText={(text) => handleItemChange(index, 'qty', parseInt(text) || 1)}
                          keyboardType="numeric"
                          className="w-16 px-2 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-center"
                          placeholder="#"
                        />
                        <TextInput
                          value={item.name}
                          onChangeText={(text) => handleItemChange(index, 'name', text)}
                          className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg"
                          placeholder="Item name"
                          placeholderTextColor="#94a3b8"
                        />
                        {items.length > 1 && (
                          <TouchableOpacity 
                            onPress={() => handleRemoveItem(index)}
                            className="p-2 justify-center"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View className="p-6 border-t border-slate-100 flex-row" style={{ gap: 12 }}>
              <TouchableOpacity 
                onPress={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl items-center"
              >
                <Text className="text-slate-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSubmit}
                className="flex-1 px-4 py-3 bg-brand-600 rounded-xl items-center shadow-lg"
              >
                <Text className="text-white font-bold">Create Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Truck Picker Modal */}
      <Modal
        visible={showTruckPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTruckPicker(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[50%]">
            <Text className="text-lg font-bold text-slate-800 mb-4">Select Truck</Text>
            <ScrollView>
              {trucks.map(truck => (
                <TouchableOpacity
                  key={truck.id}
                  onPress={() => {
                    setExpectedTruckId(truck.id);
                    setShowTruckPicker(false);
                  }}
                  className="py-4 border-b border-slate-100 flex-row items-center"
                >
                  <TruckIcon size={20} color="#0088CC" />
                  <Text className="ml-3 text-slate-900 font-medium">{truck.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowTruckPicker(false)}
              className="mt-4 py-3 bg-slate-100 rounded-xl items-center"
            >
              <Text className="text-slate-600 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Proof & Signature Gallery Modal */}
      <Modal
        visible={selectedProofData !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedProofData(null)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setSelectedProofData(null)}
          className="flex-1 bg-black/90 items-center justify-center p-4"
        >
          <View className="w-full max-w-4xl max-h-[90%]">
            <TouchableOpacity
              onPress={() => setSelectedProofData(null)}
              className="absolute -top-12 right-0"
            >
              <X size={32} color="white" />
            </TouchableOpacity>
            
            <ScrollView className="p-4">
              {/* Photos */}
              <View className="mb-6">
                  <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
                  <Eye size={16} color="white" />
                  <Text className="text-white font-bold text-sm uppercase opacity-80">Proof Photos</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedProofData?.images.map((img, idx) => (
                    <Image 
                      key={idx}
                      source={{ uri: img }} 
                      style={{ width: 300, height: 400, borderRadius: 8, marginRight: 16 }}
                      resizeMode="contain"
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Signature */}
              {selectedProofData?.signature && (
                <View>
                  <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
                    <PenTool size={16} color="white" />
                    <Text className="text-white font-bold text-sm uppercase opacity-80">Digital Signature</Text>
                  </View>
                  <View className="bg-white rounded-xl p-4 items-center">
                    <Image 
                      source={{ uri: selectedProofData.signature }} 
                      style={{ width: 200, height: 80 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
