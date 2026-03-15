import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');

  // // First boot state
  // const [showFirstBoot, setShowFirstBoot] = useState(false);
  // // ADD THIS:
  // const [checkingFirstBoot, setCheckingFirstBoot] = useState(true);
  // const [firstBootPrintout, setFirstBootPrintout] = useState("");


  const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5001`;

  // Check if user is already logged in (check localStorage on mount)
  useEffect(() => {
    // const savedUsername = localStorage.getItem('username');
    // if (savedUsername) {
    //   setUsername(savedUsername);
    //   setIsAuthenticated(true);
    //   setShowLogin(false);
    //   fetchFiles();
    // }
    fetchAdminStatus();
    console.log(isAdmin)
  }, []);

  // const fetchFirstBoot = async () => {
  //   try {
  //     const response = await fetch(`${API_BASE_URL}/isfirstboot`);
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }
  //     const data = await response.json();
      
  //     if (!data.hasOwnProperty("status")) {
  //       throw new Error(`No status in response!`);
  //     } else {
  //       if (data.status === "true") {
  //         setShowFirstBoot(true);
  //         setCheckingFirstBoot(false);
  //         setFirstBootPrintout(data.logdets[0] + data.logdets[1]);
  //       } else { //"logdets":therow[1:]
  //         setCheckingFirstBoot(false);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('First boot check error:', error.message);
  //     // Fallback to localStorage check
  //     const savedUsername = localStorage.getItem('username');
  //     if (savedUsername) {
  //       setUsername(savedUsername);
  //       setIsAuthenticated(true);
  //       fetchFiles();
  //     } else {
  //       setShowLogin(true);
  //     }
  //     setCheckingFirstBoot(false);
  //   }
  // };

  const fetchAdminStatus = async () => {
    try{
      const response = await fetch(`${API_BASE_URL}/isadmin`, {credentials: "include"});
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!("status" in data)) {
        throw new Error(`No status!`);
      }
      else{
        setIsAdmin(data.status === "true");
      }
    }
    catch(error){
      console.error(error.message)
    }
  }

  // Fetch list of files (only if authenticated)
  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/files`, {credentials: "include"});
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError('Failed to connect to server. Make sure Flask is running on port 5000');
    }
  };

  const handleLogin = (loggedInUsername) => {
    setIsAuthenticated(true);
    setUsername(loggedInUsername);
    // localStorage.setItem('username', loggedInUsername);
    fetchFiles(); // Load files after login
    fetchAdminStatus();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {credentials: "include"});
      if (response.ok) {
        setIsAuthenticated(false);
        setUsername('');
        localStorage.removeItem('username');
        setShowLogin(true);
        setFiles([]); // Clear files
        setSuccessMessage('Logged out successfully');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout');
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setError('');
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'POST',
        body: formData,
        credentials: "include"
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setSuccessMessage(`Successfully uploaded: ${selectedFile.name}`);
      setSelectedFile(null);
      document.getElementById('file-input').value = '';
      fetchFiles(); // Refresh file list
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  // Handle file download
  const handleDownload = async (filename) => {
    try {
      const fileUrl = `${API_BASE_URL}/files/${encodeURIComponent(filename)}`;
      const response = await fetch(fileUrl, {credentials: "include"});
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Download failed: ${text}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download file');
    }
  };

  // Handle file view in window
  const handleWindow = async (filename) => {
    try {
      const fileUrl = `${API_BASE_URL}/files/${encodeURIComponent(filename)}`;
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('View error:', error);
      setError('Failed to open file');
    }
  };

  // Handle file delete
  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
        , credentials: "include"
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSuccessMessage(`Deleted: ${filename}`);
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // ADD THIS after the return statement, before the header div:
  // if (checkingFirstBoot) {
  //   return (
  //     <div className="App">
  //       <header className="App-header">
  //         <div className="loading-spinner">
  //           <p>Checking server status...</p>
  //         </div>
  //       </header>
  //     </div>
  //   );
  // }

  {isAdmin && (
  <button 
    onClick={() => handleDelete(file.name)}
    className="action-btn delete-btn"
    title="Delete"
  >
    🗑️
  </button>
)}

  if(isAdmin){
    return (
      <div className="App">
        <header className="App-header">
          <div className="header-top">
            <h1>📚 local.learn</h1>
            <p className="subtitle">Your Personal Learning Resource Manager</p>
            
            {isAuthenticated && (
              <div className="user-info">
                <span className="username">👤 {username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Show Login Modal */}
          {showLogin && !isAuthenticated && (
            <Login onLogin={handleLogin} onClose={() => setShowLogin(false)} />
          )}

          {/* Status Messages */}
          {error && (
            <div className="error-message">
              ❌ {error}
              <button onClick={() => setError('')} className="close-btn">×</button>
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              ✅ {successMessage}
              <button onClick={() => setSuccessMessage('')} className="close-btn">×</button>
            </div>
          )}

          {/* Main content - only show when authenticated */}
          {isAuthenticated ? (
            <>
              {/* Upload Section */}
              <div className="upload-card">
                <h2>📤 Upload Learning Resource</h2>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpload();
                  }} 
                  className="upload-form"
                >
                  <div className="file-input-wrapper">
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={loading}
                      className="file-input"
                    />
                    {selectedFile && (
                      <div className="file-info">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={!selectedFile || loading}
                    className="upload-button"
                  >
                    {loading ? (
                      <span>
                        {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Uploading...'}
                      </span>
                    ) : 'Upload Resource'}
                  </button>
                </form>
              </div>

              {/* Files List */}
              <div className="files-card">
                <h2>📁 Available Resources ({files.length})</h2>
                
                {files.length === 0 ? (
                  <p className="no-files">No resources available. Upload your first learning material!</p>
                ) : (
                  <ul className="files-list">
                    {files.map((file) => (
                      <li key={file.name} className="file-item">
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-meta">
                              {formatFileSize(file.size)} • Modified: {formatDate(file.modified)}
                            </span>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button 
                            onClick={() => handleWindow(file.name)}
                            className="action-btn view-btn"
                            title="Open in a Window"
                          >
                            🪟
                          </button>
                          <button 
                            onClick={() => handleDownload(file.name)}
                            className="action-btn download-btn"
                            title="Download"
                          >
                            ⬇️
                          </button>
                          <button 
                            onClick={() => handleDelete(file.name)}
                            className="action-btn delete-btn"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Server Info */}
              <div className="info-card">
                <h3>ℹ️ Server Information</h3>
                <p>Files are stored locally in: <code>uploads/</code></p>
                <p className="server-status">
                  Server: <span className="status-online">● Connected</span>
                </p>
                <p className="server-url">
                  API: <code>{API_BASE_URL}</code>
                </p>
              </div>
            </>
          ) : (
            <div className="login-prompt">
              <p>Please log in to access your learning resources</p>
              <button onClick={() => setShowLogin(true)} className="show-login-btn">
                Go to Login
              </button>
            </div>
          )}
        </header>
      </div>
    );
  }
  else{
    return (
      <div className="App">
        <header className="App-header">
          <div className="header-top">
            <h1>📚 local.learn</h1>
            <p className="subtitle">Your Personal Learning Resource Manager</p>
            
            {isAuthenticated && (
              <div className="user-info">
                <span className="username">👤 {username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
            
          {/* Show Login Modal */}
          {showLogin && !isAuthenticated && (
            <Login onLogin={handleLogin} onClose={() => setShowLogin(false)} />
          )}

          {/* Status Messages */}
          {error && (
            <div className="error-message">
              ❌ {error}
              <button onClick={() => setError('')} className="close-btn">×</button>
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              ✅ {successMessage}
              <button onClick={() => setSuccessMessage('')} className="close-btn">×</button>
            </div>
          )}

          {/* Main content - only show when authenticated */}
          {isAuthenticated ? (
            <>
              {/* Upload Section */}
              <div className="upload-card">
                <h2>📤 Upload Learning Resource</h2>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpload();
                  }} 
                  className="upload-form"
                >
                  <div className="file-input-wrapper">
                    <input
                      id="file-input"
                      type="file"
                      onChange={handleFileSelect}
                      disabled={loading}
                      className="file-input"
                    />
                    {selectedFile && (
                      <div className="file-info">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={!selectedFile || loading}
                    className="upload-button"
                  >
                    {loading ? (
                      <span>
                        {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Uploading...'}
                      </span>
                    ) : 'Upload Resource'}
                  </button>
                </form>
              </div>

              {/* Files List */}
              <div className="files-card">
                <h2>📁 Available Resources ({files.length})</h2>
                
                {files.length === 0 ? (
                  <p className="no-files">No resources available. Upload your first learning material!</p>
                ) : (
                  <ul className="files-list">
                    {files.map((file) => (
                      <li key={file.name} className="file-item">
                        <div className="file-info">
                          <span className="file-icon">📄</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-meta">
                              {formatFileSize(file.size)} • Modified: {formatDate(file.modified)}
                            </span>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button 
                            onClick={() => handleWindow(file.name)}
                            className="action-btn view-btn"
                            title="Open in a Window"
                          >
                            🪟
                          </button>
                          <button 
                            onClick={() => handleDownload(file.name)}
                            className="action-btn download-btn"
                            title="Download"
                          >
                            ⬇️
                          </button>
                          
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Server Info */}
              <div className="info-card">
                <h3>ℹ️ Server Information</h3>
                <p>Files are stored locally in: <code>uploads/</code></p>
                <p className="server-status">
                  Server: <span className="status-online">● Connected</span>
                </p>
                <p className="server-url">
                  API: <code>{API_BASE_URL}</code>
                </p>
              </div>
            </>
          ) : (
            <div className="login-prompt">
              <p>Please log in to access your learning resources</p>
              <button onClick={() => setShowLogin(true)} className="show-login-btn">
                Go to Login
              </button>
            </div>
          )}
        </header>
      </div>
    );
  }
}

export default App;
