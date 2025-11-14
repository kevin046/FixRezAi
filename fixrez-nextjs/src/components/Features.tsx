import { Card } from "@/components/ui/card";
import { Brain, FileText, TrendingUp, Users } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced AI technology analyzes your resume and provides intelligent suggestions for improvement."
    },
    {
      icon: FileText,
      title: "ATS Optimization",
      description: "Optimize your resume for Applicant Tracking Systems to increase your chances of getting noticed."
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description: "Track your resume's performance and see how it improves over time with our analytics."
    },
    {
      icon: Users,
      title: "Industry Experts",
      description: "Get insights from industry professionals and career coaches to make your resume stand out."
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Resume Success
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive suite of tools helps you create a resume that gets results
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}