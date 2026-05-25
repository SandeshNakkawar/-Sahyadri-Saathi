import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import Home from './pages/Home';
import PlacesList from './pages/PlacesList';
import PlaceDetail from './pages/PlaceDetail';
import GuideDetail from './pages/GuideDetail';
import GuidesList from './pages/GuidesList';
import Login from './pages/Login';
import Signup from './pages/Signup';
import GuideOnboarding from './pages/GuideOnboarding';
import TouristDashboard from './pages/TouristDashboard';
import GuideDashboard from './pages/GuideDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingSuccess from './pages/BookingSuccess';
import Chat from './pages/Chat';
import BookingDetail from './pages/BookingDetail';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="places" element={<PlacesList />} />
            <Route path="places/:slug" element={<PlaceDetail />} />
            <Route path="guides" element={<GuidesList />} />
            <Route path="guides/:id" element={<GuideDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            
            {/* Guide Onboarding (Protected) */}
            <Route 
              path="guide-onboarding" 
              element={
                <ProtectedRoute roles={['guide']}>
                  <GuideOnboarding />
                </ProtectedRoute>
              } 
            />
            
            {/* Tourist Dashboard (Protected) */}
            <Route 
              path="dashboard/tourist" 
              element={
                <ProtectedRoute roles={['tourist']}>
                  <TouristDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Chat Coordinator (Protected) */}
            <Route 
              path="chat" 
              element={
                <ProtectedRoute roles={['tourist', 'guide']}>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="chat/:bookingId" 
              element={
                <ProtectedRoute roles={['tourist', 'guide']}>
                  <Chat />
                </ProtectedRoute>
              } 
            />

            {/* Booking Detail (Protected) */}
            <Route 
              path="booking/:id" 
              element={
                <ProtectedRoute roles={['tourist', 'guide', 'admin']}>
                  <BookingDetail />
                </ProtectedRoute>
              } 
            />

            {/* Stripe Success Landing (Protected) */}
            <Route 
              path="booking-success" 
              element={
                <ProtectedRoute roles={['tourist']}>
                  <BookingSuccess />
                </ProtectedRoute>
              } 
            />
            
            {/* Guide Workspace (Protected) */}
            <Route 
              path="dashboard/guide" 
              element={
                <ProtectedRoute roles={['guide']}>
                  <GuideDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Dashboard (Protected) */}
            <Route 
              path="dashboard/admin" 
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
