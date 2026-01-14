import "./global.css";    // ✅ ADD THIS
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutDashboard, ScanLine, ClipboardList } from 'lucide-react-native';
import Dashboard from './src/Dashboard';
import Scanner from './src/Scanner';
import DispatchLog from './src/DispatchLog';
import { INITIAL_ORDERS, INITIAL_TRUCKS } from './src/constants'; 
import * as Device from 'expo-device';
import { Order, LogEntry, OrderStatus, ScanAction } from './src/types';


export default function App() {
  const [view, setView] = useState('DASHBOARD');
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [deviceName, setDeviceName] = useState("Unknown Driver");
  useEffect(() => {
    // This gets names like "Howe's iPhone" or "Samsung Galaxy"
    if (Device.deviceName) {
      setDeviceName(Device.deviceName);
    } else if (Device.modelName) {
      setDeviceName(Device.modelName);
    }
  }, []);
  // Simple mock handler for scanning
  const handleScan = (orderId: string, action: ScanAction, isMatch: boolean, truckId?: string, proofImages?: string[], gps?: string, signature?: string) => {
    const timestamp = Date.now();
    
    const newLog: LogEntry = {
      id: timestamp.toString(),
      timestamp,
      orderId,
      scannedBy: deviceName,
      action: action,
      truckId,
      gpsLocation: gps,
      proofImages,
      signature,
      isMatch
    };
    setLogs(prev => [newLog, ...prev]);

    if (isMatch) {
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { 
          ...o, 
          status: action === 'PICKUP' ? OrderStatus.PICKED_UP : OrderStatus.LOADED,
          lastAction: action,
          lastScannedAt: timestamp,
          lastScannedBy: deviceName, // Also update order status with name
          proofImages: proofImages,
          signature: signature
        } : o
      ));
    }
  };

  const handleAddOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const renderView = () => {
    switch(view) {
      case 'SCANNER': return <Scanner trucks={INITIAL_TRUCKS} orders={orders} onScan={handleScan} goBack={() => setView('DASHBOARD')} />;
      case 'LOGS': return <DispatchLog logs={logs} />;
      default: return <Dashboard orders={orders} trucks={INITIAL_TRUCKS} onAddOrder={handleAddOrder} onDeleteOrder={handleDeleteOrder} />;
    }
  };

  return (
    <SafeAreaProvider>
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Main Content Area - takes all available space */}
      <View className="flex-1">
        {renderView()}
      </View>

      {/* Bottom Tab Bar - Matches your screenshot */}
      <View className="flex-row justify-around items-center bg-white border-t border-slate-200 h-[90px] pb-6 pt-2 shadow-2xl elevation-10">
        
        <NavButton 
          active={view === 'DASHBOARD'} 
          onPress={() => setView('DASHBOARD')} 
          icon={LayoutDashboard} 
          label="DASHBOARD" 
        />
        
        {/* Floating Scan Button (Big Blue Button) */}
        <View className="-mt-10">
          <TouchableOpacity 
            onPress={() => setView('SCANNER')}
            className="w-16 h-16 rounded-full items-center justify-center bg-brand-600 shadow-xl shadow-brand-500/50 elevation-10 border-4 border-slate-50"
          >
            <ScanLine color="white" size={30} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <NavButton 
          active={view === 'LOGS'} 
          onPress={() => setView('LOGS')} 
          icon={ClipboardList} 
          label="HISTORY" 
        />
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const NavButton = ({ active, onPress, icon: Icon, label }: any) => (
  <TouchableOpacity onPress={onPress} className="items-center justify-center w-20">
    <Icon size={24} color={active ? '#0088CC' : '#94a3b8'} strokeWidth={active ? 2.5 : 2} />
    <Text className={`text-[10px] font-bold mt-1 tracking-wide ${active ? 'text-brand-600' : 'text-slate-400'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);