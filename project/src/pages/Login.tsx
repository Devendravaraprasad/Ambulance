import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ambulance, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'driver' | 'hospital'>('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Check if the error is related to wrong credentials
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            setError('Wrong credentials. Please check your email and password.');
          } else {
            setError('An unexpected error occurred. Please try again.');
          }
          throw signInError;
        }

        navigate(role === 'driver' ? '/driver' : '/hospital');
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              role,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('duplicate')) {
            setError('This email is already registered. Please sign in instead.');
          } else {
            setError('Sign-up failed. Please try again later.');
          }
          throw signUpError;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                role: role,
                name: username,
              },
            ]);
          if (profileError) throw profileError;

          setSuccessMessage('Account created successfully! You can now sign in.');
          setEmail('');
          setPassword('');
          setUsername('');
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Emergency Response System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={() => setRole('driver')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              role === 'driver'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Ambulance className="h-5 w-5" />
            <span>Driver</span>
          </button>
          <button
            onClick={() => setRole('hospital')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              role === 'hospital'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Building2 className="h-5 w-5" />
            <span>Hospital</span>
          </button>
        </div>

        {successMessage && (
          <div
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative"
            role="alert"
          >
            {successMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading
                ? isLogin
                  ? 'Signing in...'
                  : 'Signing up...'
                : isLogin
                ? 'Sign in'
                : 'Sign up'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccessMessage('');
              }}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
