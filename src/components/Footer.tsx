import Image from "next/image";

const Footer = () => {
  return (
    <footer className="relative h-[25vh] w-full">
      <Image
        src="/assets/wood.png"
        alt="Wood Background"
        fill
        className="object-cover w-full h-full"
        priority
      />
      <div className="relative h-full px-4">
        <div className="flex items-center justify-between h-full">
          {/* Left Logo */}
          <div className="w-41 h-41 relative flex items-center justify-center">
            <Image
              src="/assets/ocean7.png"
              alt="Left Logo"
              width={300}
              height={300}
              className="object-contain mt-11"
            />
          </div>

          {/* Center Logo */}
          <div className="w-41 h-45 relative flex items-center justify-center">
            <Image
              src="/assets/mini_flush.png"
              alt="Center Logo"
              width={600}
              height={600}
              className="object-contain mt-11"
            />
          </div>

          {/* Right Logo */}
          <div className="w-41 h-41 relative flex items-center justify-center">
            <Image
              src="/assets/table.png"
              alt="Right Logo"
              width={300}
              height={300}
              className="object-contain mt-11"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
