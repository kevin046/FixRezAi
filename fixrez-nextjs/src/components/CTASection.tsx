import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">
          Ready to Transform Your Resume?
        </h2>
        <p className="text-xl mb-8 text-purple-100">
          Join thousands of job seekers who have landed their dream jobs with FixRez AI
        </p>
        <Button
          size="lg"
          className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 py-3"
        >
          Start Optimizing Your Resume
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
}