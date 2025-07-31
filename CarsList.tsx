import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Car = {
  id: string;
  brand: string;
  model: string;
  reg_nr: string;
  km: number;
  price: number;
  created_at: string;
};

export default function CarsList() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Feil ved henting av biler:", error);
      } else {
        setCars(data as Car[]);
      }
      setLoading(false);
    };

    fetchCars();
  }, []);

  if (loading) return <p>Laster biler...</p>;
  if (cars.length === 0) return <p>Ingen biler funnet.</p>;

  return (
    <div>
      <h2>Biler registrert</h2>
      <ul>
        {cars.map((car) => (
          <li key={car.id}>
            <strong>
              {car.brand} {car.model}
            </strong>
            <br />
            Reg.nr: {car.reg_nr}
            <br />
            Km: {car.km}
            <br />
            Pris: {car.price} kr
          </li>
        ))}
      </ul>
    </div>
  );
}
