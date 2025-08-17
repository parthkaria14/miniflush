import Image from "next/image";

const Footer = () => {
  return (
    <footer className="relative h-[10vh] w-full bottom-0">
      <Image
        src="/assets/wood.png"
        alt="Wood Background"
        fill
        className="object-cover w-full h-full rotate-180"
        priority
      />
    </footer>
  );
};

export default Footer;
