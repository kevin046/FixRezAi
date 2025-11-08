import Image from "next/image";

export function TrustedBy() {
  const companies = [
    { name: "Google", logo: "/placeholder.svg" },
    { name: "Microsoft", logo: "/placeholder.svg" },
    { name: "Amazon", logo: "/placeholder.svg" },
    { name: "Apple", logo: "/placeholder.svg" },
    { name: "Meta", logo: "/placeholder.svg" },
    { name: "Netflix", logo: "/placeholder.svg" }
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            Trusted by Professionals at Leading Companies
          </h3>
          <p className="text-gray-600">
            Our users have landed jobs at top companies worldwide
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {companies.map((company, index) => (
            <div key={index} className="flex justify-center">
              <div className="text-gray-400 font-semibold text-lg">
                {company.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}