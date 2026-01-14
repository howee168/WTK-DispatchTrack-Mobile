# WTK-DispatchTrack-Mobile

A mobile application for tracking dispatch jobs, built with React Native and Expo.

## Features

- **QR Code Scanning**: Scan job orders using device camera
- **Multi-step Verification**: Complete workflow with checklist, photo proof, and signature
- **Job Tracking Dashboard**: Visualize job status and details
- **Truck Assignment**: Assign jobs to specific trucks
- **Audit Trail**: Track all actions with timestamps and user info
- **Photo Documentation**: Capture and store proof of pickup/delivery

## Tech Stack

- React Native
- Expo
- TypeScript
- NativeWind (Tailwind CSS for React Native)
- Lucide React Native Icons
- Expo Camera
- Expo Image Manipulator

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   npx expo start
   ```

## Usage

1. Create job orders via the dashboard
2. Use the scanner to scan QR codes associated with jobs
3. Follow the multi-step verification process
4. Review logs to track all activities

## Components

- [App.tsx](file:///c:/Users/howeh/WTK-DispatchTrack-Mobile/App.tsx): Main application component with navigation
- [Dashboard.tsx](file:///c:/Users/howeh/WTK-DispatchTrack-Mobile/src/Dashboard.tsx): Overview of all job orders
- [Scanner.tsx](file:///c:/Users/howeh/WTK-DispatchTrack-Mobile/src/Scanner.tsx): QR scanning and verification flow
- [DispatchLog.tsx](file:///c:/Users/howeh/WTK-DispatchTrack-Mobile/src/DispatchLog.tsx): Audit trail of all scans
- [types.ts](file:///c:/Users/howeh/WTK-DispatchTrack-Mobile/src/types.ts): Type definitions

## Screenshots

Coming soon...

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT