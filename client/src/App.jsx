import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // We'll create this file for basic styling

// The base URL for our sample application's backend server.
const API_BASE_URL = 'http://localhost:3000';

function App() {
  // State to hold the user's authentication status and profile data.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect hook runs once when the component mounts.
  // Its job is to check with the backend if the user is already logged in.
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Make a request to our backend's /api/auth-status endpoint.
        // We don't need credentials here as the browser will automatically send the session cookie.
        const response = await axios.get(`${API_BASE_URL}/api/auth-status`, { withCredentials: true });
        
        if (response.data.isAuthenticated) {
            setIsAuthenticated(true);
            setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        // If there's an error, assume the user is not authenticated.
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []); // The empty dependency array means this effect runs only once.

  // A simple loading state while we check the auth status.
  if (isLoading) {
    return <div className="container"><h1>Loading...</h1></div>;
  }

  return (
    <div className="container">
      <header>
        <h1>1001 OIDC Sample Partner App</h1>
      </header>
      <main>
        {isAuthenticated ? (
          <UserProfile user={user} />
        ) : (
          <Login />
        )}
      </main>
    </div>
  );
}

// --- Components ---

/**
 * The component shown to users who are not logged in.
 */
const Login = () => {
  return (
    <div className="card">
      <h2>Welcome</h2>
      <p>Please log in with your 1001 account to continue.</p>
      {/* This is a simple link. When clicked, the browser will navigate to our backend's
          /api/login route, which will then redirect the user to the OIDC provider. */}
      <a href={`${API_BASE_URL}/api/login`} className="button">
        Login with 1001
      </a>
    </div>
  );
};

/**
 * The component shown to users who are successfully logged in.
 */
const UserProfile = ({ user }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');

    // This effect runs when the component mounts to fetch fresh user data
    // from the /userinfo endpoint via our backend.
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/user-profile`, { withCredentials: true });
                setUserInfo(response.data);
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
                setError('Could not fetch your user profile.');
            }
        };
        fetchUserInfo();
    }, []);


  return (
    <div className="card">
      <h2>Welcome, {user?.name || user?.phone_number || 'User'}!</h2>
      <p>You have successfully authenticated with the 1001 OIDC provider.</p>
      
      <h3>ID Token Claims:</h3>
      <p>This is the identity information that was included in the ID Token.</p>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      
      <h3>UserInfo Endpoint Data:</h3>
      <p>This is fresh user data fetched from the `/userinfo` endpoint using the Access Token.</p>
      {error && <p className="error">{error}</p>}
      {userInfo ? <pre>{JSON.stringify(userInfo, null, 2)}</pre> : <p>Loading user info...</p>}

      {/* This link points to our backend's logout route, which will destroy the session
          and then redirect the user back to the root of this frontend app. */}
      <a href={`${API_BASE_URL}/api/logout`} className="button secondary">
        Logout
      </a>
    </div>
  );
};

export default App;
