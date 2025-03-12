import { Link, useNavigate } from "react-router-dom";


const LoginSelection = () => {
    const navigate = useNavigate();

    const emailLogin = () => {
        navigate("/login");
    }
    const passkeyLogin = () => {
        navigate("/passkeylogin");
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="w-[400px] bg-green-200 bg-opacity-30 text-black rounded-xl p-8 shadow-lg">
                {/* Passkey Login Button */}
                <button
                    onClick={passkeyLogin}
                    className="w-full h-12 bg-white text-gray-700 font-bold rounded-full shadow-md mt-4 hover:bg-gray-200 transition"
                >
                    Email Login
                </button>

                {/* Email Login Button */}

                <button
                    onClick={emailLogin}
                    className="w-full h-12 bg-white text-gray-700 font-bold rounded-full shadow-md mt-4 hover:bg-gray-200 transition"
                >
                    Email Login
                </button>


            </div>
        </div>
    );
};

export default LoginSelection;
