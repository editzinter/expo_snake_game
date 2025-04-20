import MagicLinkForm from "@/components/auth/MagicLinkForm";
import Link from "next/link";

export default function MagicLinkPage() {
  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold">
          Sign in with magic link
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          No password required - we'll send you a link to sign in
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <MagicLinkForm />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                href="/sign-in"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700
                         rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200
                         bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Email and Password
              </Link>
              
              <Link
                href="/sign-up"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700
                         rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200
                         bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 