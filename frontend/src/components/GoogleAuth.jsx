import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const GoogleAuth = ({ onSuccess, onError, buttonText = 'signup_with' }) => {
  const googleButtonRef = useRef(null);
  const isInitialized = useRef(false);
  const [errorState, setErrorState] = useState(null);
  const [shouldHide, setShouldHide] = useState(false);
  const errorStateRef = useRef(null);
  const shouldHideRef = useRef(false);

  useEffect(() => {
    // Store original console methods IMMEDIATELY
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    // Get current origin dynamically
    const currentOrigin = window.location.origin;
    
    // Set up error suppression IMMEDIATELY before anything else
    const errorSuppressor = (...args) => {
      const errorMessage = String(args.join(' ')).toLowerCase();
      
      // Suppress all Google Sign-In related errors - comprehensive list
      if (
        errorMessage.includes('gsi_logger') ||
        errorMessage.includes('not allowed for the given client id') ||
        errorMessage.includes('the given origin is not allowed') ||
        errorMessage.includes('provided button width is invalid') ||
        errorMessage.includes('failed to load resource') ||
        errorMessage.includes('403') ||
        errorMessage.includes('accounts.google.com') ||
        errorMessage.includes('credential button library') ||
        errorMessage.includes('button?theme=outline') ||
        errorMessage.includes('ssl.gstatic.com') ||
        errorMessage.includes('googleapis.com') ||
        errorMessage.includes('gstatic.com') ||
        (errorMessage.includes('google') && errorMessage.includes('error')) ||
        (errorMessage.includes('google') && errorMessage.includes('403'))
      ) {
        // Set state to hide button if origin error detected
        if (errorMessage.includes('not allowed for the given client id') || 
            errorMessage.includes('403') ||
            errorMessage.includes('gsi_logger') ||
            errorMessage.includes('the given origin is not allowed') ||
            (errorMessage.includes('failed to load') && errorMessage.includes('google'))) {
          const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
          setShouldHide(true);
          setErrorState(errorMsg);
          shouldHideRef.current = true;
          errorStateRef.current = errorMsg;
        }
        return; // Suppress the error - don't log it
      }
      originalError.apply(console, args);
    };

    const warnSuppressor = (...args) => {
      const warnMessage = String(args.join(' ')).toLowerCase();
      if (
        warnMessage.includes('gsi_logger') ||
        warnMessage.includes('google') ||
        warnMessage.includes('client id') ||
        warnMessage.includes('not allowed') ||
        warnMessage.includes('403') ||
        warnMessage.includes('accounts.google.com')
      ) {
        return; // Suppress the warning
      }
      originalWarn.apply(console, args);
    };

    const logSuppressor = (...args) => {
      const logMessage = String(args.join(' ')).toLowerCase();
      if (
        logMessage.includes('gsi_logger') ||
        (logMessage.includes('google') && logMessage.includes('error'))
      ) {
        return; // Suppress Google-related logs
      }
      originalLog.apply(console, args);
    };

    // Apply error suppression IMMEDIATELY - before any script loads
    console.error = errorSuppressor;
    console.warn = warnSuppressor;
    console.log = logSuppressor;
    
    // Intercept fetch requests to suppress Google API 403 errors
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (
        url.includes('accounts.google.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('google.com')
      )) {
        return originalFetch.apply(this, args)
          .then(response => {
            // Check for 403 status
            if (response.status === 403) {
              const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
              setShouldHide(true);
              setErrorState(errorMsg);
              shouldHideRef.current = true;
              errorStateRef.current = errorMsg;
              // Return a rejected promise to suppress the error
              return Promise.reject(new Response(null, { status: 403, statusText: 'Forbidden' }));
            }
            return response;
          })
          .catch((error) => {
            // Suppress 403 errors from Google
            if (error.status === 403 || error.message?.includes('403') || error.name === 'TypeError') {
              const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
              setShouldHide(true);
              setErrorState(errorMsg);
              shouldHideRef.current = true;
              errorStateRef.current = errorMsg;
              // Suppress the error completely
              return Promise.reject(new Error('Suppressed Google API error'));
            }
            return Promise.reject(error);
          });
      }
      return originalFetch.apply(this, args);
    };
    
    // Add event listener for GSI errors - catch errors from script loading
    const errorListener = (event) => {
      const errorMessage = (event.message || event.error?.message || event.filename || '').toLowerCase();
      const errorSource = (event.filename || event.target?.src || '').toLowerCase();
      
      // Check if error is from Google domains
      const isGoogleError = errorSource.includes('google.com') || 
                           errorSource.includes('googleapis.com') || 
                           errorSource.includes('gstatic.com') ||
                           errorMessage.includes('gsi_logger') || 
                           errorMessage.includes('not allowed') || 
                           errorMessage.includes('the given origin is not allowed') ||
                           errorMessage.includes('403') ||
                           (errorMessage.includes('origin') && errorMessage.includes('client id'));
      
      if (isGoogleError) {
        const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
        setShouldHide(true);
        setErrorState(errorMsg);
        shouldHideRef.current = true;
        errorStateRef.current = errorMsg;
        // Prevent default error handling and stop propagation
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };
    
    // Add multiple error listeners to catch all types of errors - use capture phase
    window.addEventListener('error', errorListener, true);
    window.addEventListener('error', errorListener, false); // Also catch in bubble phase
    
    // Intercept resource loading errors
    const resourceErrorListener = (event) => {
      const target = event.target;
      if (target && (
        target.src?.includes('google.com') ||
        target.src?.includes('googleapis.com') ||
        target.src?.includes('gstatic.com')
      )) {
        const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
        setShouldHide(true);
        setErrorState(errorMsg);
        shouldHideRef.current = true;
        errorStateRef.current = errorMsg;
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    window.addEventListener('error', resourceErrorListener, true);
    
    const rejectionHandler = (event) => {
      const errorMessage = String(event.reason || event.reason?.message || '').toLowerCase();
      if (errorMessage.includes('gsi') || 
          errorMessage.includes('google') || 
          errorMessage.includes('not allowed') ||
          errorMessage.includes('403') ||
          errorMessage.includes('gsi_logger')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    window.addEventListener('unhandledrejection', rejectionHandler, true);

    // Check for client ID first
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      const errorMsg = 'Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file and restart the dev server.';
      setErrorState(errorMsg);
      setShouldHide(true);
      shouldHideRef.current = true;
      errorStateRef.current = errorMsg;
      return;
    }

    // Only load Google script if we should show the button
    if (shouldHide) {
      console.error = originalError;
      console.warn = originalWarn;
      return;
    }

    // Load Google Identity Services script
    if (!window.google && !isInitialized.current) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Small delay to let any errors surface
        setTimeout(initializeGoogleSignIn, 200);
      };
      script.onerror = () => {
        console.error = originalError;
        console.warn = originalWarn;
        const errorMsg = 'Failed to load Google Sign-In script. Please check your internet connection.';
        setErrorState(errorMsg);
        setShouldHide(true);
        shouldHideRef.current = true;
        errorStateRef.current = errorMsg;
      };
      document.head.appendChild(script);
      isInitialized.current = true;
    } else if (window.google) {
      initializeGoogleSignIn();
    }

    function initializeGoogleSignIn() {
      if (shouldHide) {
        console.error = originalError;
        console.warn = originalWarn;
        return;
      }

      if (!window.google || !googleButtonRef.current) {
        // Retry after a short delay if script not loaded yet
        setTimeout(initializeGoogleSignIn, 100);
        return;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId || shouldHide) {
        if (googleButtonRef.current) {
          googleButtonRef.current.style.display = 'none';
        }
        console.error = originalError;
        console.warn = originalWarn;
        return;
      }

      try {
        // Wrap callback to check for errors before proceeding
        const wrappedCallback = (response) => {
          // Check current error state using refs for up-to-date values
          if (shouldHideRef.current || errorStateRef.current) {
            if (onError) {
              onError(errorStateRef.current || 'Google Sign-In is not properly configured.');
            }
            return;
          }
          handleCredentialResponse(response);
        };
        
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: wrappedCallback,
        });

        // Wait for the container to be rendered to get its width
        setTimeout(() => {
          if (!googleButtonRef.current || shouldHide) {
            console.error = originalError;
            console.warn = originalWarn;
            return;
          }
          
          // Get the width of the container, default to 400px if not available
          const containerWidth = googleButtonRef.current?.parentElement?.offsetWidth || 400;
          
          // Ensure width is a valid number (pixels) - Google requires between 200-400
          const buttonWidth = Math.max(200, Math.min(containerWidth, 400));
          
          try {
            window.google.accounts.id.renderButton(
              googleButtonRef.current,
              {
                theme: 'outline',
                size: 'large',
                text: buttonText,
                width: buttonWidth,
                type: 'standard'
              }
            );
            // Restore console methods after successful render
            setTimeout(() => {
              console.error = originalError;
              console.warn = originalWarn;
            }, 500);
            setErrorState(null);
            setShouldHide(false);
            shouldHideRef.current = false;
            errorStateRef.current = null;
          } catch (renderError) {
            // If render fails, try without width specification
            try {
              window.google.accounts.id.renderButton(
                googleButtonRef.current,
                {
                  theme: 'outline',
                  size: 'large',
                  text: buttonText,
                  type: 'standard'
                }
              );
              setTimeout(() => {
                console.error = originalError;
                console.warn = originalWarn;
              }, 500);
              setErrorState(null);
              setShouldHide(false);
            } catch (fallbackError) {
              // Origin error detected - hide button and show message
              const currentOrigin = window.location.origin;
              const errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
              setShouldHide(true);
              setErrorState(errorMsg);
              shouldHideRef.current = true;
              errorStateRef.current = errorMsg;
              console.error = originalError;
              console.warn = originalWarn;
            }
          }
        }, 200);
      } catch (error) {
        // Origin error or other initialization error
        const currentOrigin = window.location.origin;
        let errorMsg;
        if (error.message && (error.message.includes('origin') || error.message.includes('not allowed') || error.message.includes('client id'))) {
          errorMsg = `Google Sign-In is not configured for this domain. Please add ${currentOrigin} to your Google Cloud Console authorized JavaScript origins.`;
        } else {
          errorMsg = 'Failed to initialize Google authentication. Please check your Google Client ID configuration.';
        }
        setShouldHide(true);
        setErrorState(errorMsg);
        shouldHideRef.current = true;
        errorStateRef.current = errorMsg;
        console.error = originalError;
        console.warn = originalWarn;
      }
    }

    async function handleCredentialResponse(response) {
      // Don't proceed if there's an error state or should hide (check refs for current state)
      if (shouldHideRef.current || errorStateRef.current) {
        if (onError) {
          onError(errorStateRef.current || 'Google Sign-In is not properly configured.');
        }
        return;
      }
      
      // Validate response
      if (!response || !response.credential) {
        if (onError) {
          onError('Invalid response from Google. Please try again.');
        }
        return;
      }
      
      try {
        // Restore console methods before making API call
        console.error = originalError;
        console.warn = originalWarn;
        
        const result = await api.post('/auth/google', {
          tokenId: response.credential
        }, {
          timeout: 60000 // 60 second timeout for Google auth
        });

        if (result.data.success) {
          // Store token
          localStorage.setItem('token', result.data.data.token);
          if (onSuccess) {
            onSuccess(result.data.data);
          }
        } else {
          if (onError) {
            onError(result.data.message || 'Google authentication failed');
          }
        }
      } catch (error) {
        console.error = originalError;
        console.warn = originalWarn;
        
        // Handle timeout errors
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          if (onError) {
            onError('Request timed out. Please check if the backend server is running and try again.');
          }
          return;
        }
        
        // Handle connection errors
        if (error.isConnectionError || error.code === 'ECONNREFUSED') {
          if (onError) {
            onError('Unable to connect to server. Please ensure the backend server is running.');
          }
          return;
        }
        
        console.error('Google auth error:', error);
        if (onError) {
          onError(error.response?.data?.message || 'Google authentication failed. Please try again.');
        }
      }
    }

    return () => {
      // Restore original methods on cleanup
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      window.fetch = originalFetch;
      window.removeEventListener('error', errorListener, true);
      window.removeEventListener('error', errorListener, false);
      window.removeEventListener('error', resourceErrorListener, true);
      window.removeEventListener('unhandledrejection', rejectionHandler, true);
    };
  }, [onSuccess, onError, buttonText]);

  // Show error message if there's an error or should hide
  if (errorState || shouldHide) {
    const currentOrigin = window.location.origin;
    return (
      <div className="w-full">
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md text-sm">
          <p className="font-medium">Google Sign-In Not Available</p>
          <p className="text-xs mt-1">{errorState || 'Google Sign-In is not properly configured.'}</p>
          {errorState && errorState.includes('authorized JavaScript origins') && (
            <div className="mt-2 text-xs">
              <p className="font-semibold mb-1">How to fix:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Google Cloud Console</a></li>
                <li>Select your OAuth 2.0 Client ID</li>
                <li>Add <code className="bg-yellow-100 px-1 rounded">{currentOrigin}</code> to "Authorized JavaScript origins"</li>
                <li>Save and wait a few minutes for changes to propagate</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={googleButtonRef} className="w-full flex justify-center"></div>
    </div>
  );
};

export default GoogleAuth;
