import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import { AlertTriangle, MapPin, Image as ImageIcon, X } from 'lucide-react-native';
// @ts-ignore
import { LogEntry } from './types'; 

// Helper to format date
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${date.toLocaleDateString()}`;
};

export default function DispatchLog({ logs }: { logs: LogEntry[] }) {
  const [selectedProofImages, setSelectedProofImages] = useState<string[] | null>(null);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-6 pt-6 pb-4 bg-white border-b border-slate-200">
        <Text className="text-3xl font-bold text-slate-800">History</Text>
        <Text className="text-slate-500 mt-1">Audit log of all scans and actions.</Text>
      </View>

      {/* List */}
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="p-12 items-center">
            <Text className="text-slate-400">No activity recorded yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white p-4 rounded-xl mb-3 border border-slate-200 shadow-sm">
            {/* Top Row: Time & Status */}
            <View className="flex-row justify-between items-start mb-2">
              <View>
                <Text className="font-bold text-slate-600 text-xs">{formatTime(item.timestamp)}</Text>
                <Text className="text-xs text-slate-400 mt-0.5">User: {item.scannedBy}</Text>
              </View>
              {item.isMatch ? (
                <View className={`px-2 py-1 rounded-full border ${item.action === 'LOAD' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                  <Text className={`text-[10px] font-bold ${item.action === 'LOAD' ? 'text-orange-700' : 'text-blue-700'}`}>
                    {item.action}
                  </Text>
                </View>
              ) : (
                <View className="bg-red-50 px-2 py-1 rounded-full border border-red-100 flex-row items-center">
                  <AlertTriangle size={10} color="#b91c1c" />
                  <Text className="text-[10px] font-bold text-red-700 ml-1">ERROR</Text>
                </View>
              )}
            </View>

            {/* Middle Row: Job Details */}
            <View className="mb-3">
              <Text className="font-mono text-lg font-bold text-slate-800">{item.orderId}</Text>
              {item.truckId && (
                <Text className="text-xs text-slate-500">Truck: {item.truckId}</Text>
              )}
            </View>

            {/* Bottom Row: Actions (Proof/GPS) */}
            <View className="flex-row items-center justify-between border-t border-slate-50 pt-3">
              {item.proofImages && item.proofImages.length > 0 ? (
                <TouchableOpacity 
                  onPress={() => setSelectedProofImages(item.proofImages!)}
                  className="flex-row items-center bg-slate-100 px-2 py-1 rounded-lg"
                >
                  <ImageIcon size={14} color="#475569" />
                  <Text className="text-xs font-bold text-slate-600 ml-1">
                    {item.proofImages.length} Photo{item.proofImages.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-xs text-slate-300 italic">No proof</Text>
              )}

              {item.gpsLocation && (
                <View className="flex-row items-center">
                  <MapPin size={12} color="#94a3b8" />
                  <Text className="text-[10px] text-slate-400 ml-1 font-mono">{item.gpsLocation}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* Image Modal */}
      <Modal visible={!!selectedProofImages} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/90 justify-center">
          <TouchableOpacity 
            onPress={() => setSelectedProofImages(null)}
            className="absolute top-12 right-6 z-50 p-2 bg-white/20 rounded-full"
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          
          <FlatList 
            data={selectedProofImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={{ width: 400, height: 600, justifyContent: 'center', alignItems: 'center' }}>
                <Image 
                  source={{ uri: item }} 
                  style={{ width: '100%', height: '80%' }} 
                  resizeMode="contain" 
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}