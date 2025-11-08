import { useState, useEffect } from "react";

export function LiveCounter() {
  const [count, setCount] = useState(1247);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 px-4 bg-blue-600 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-3xl font-bold mb-4">
          Join {count.toLocaleString()}+ Job Seekers Who Have Optimized Their Resumes
        </h3>
        <p className="text-xl text-blue-100">
          Real-time resume optimizations happening right now
        </p>
      </div>
    </section>
  );
}