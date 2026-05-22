import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

/** @deprecated Use photo capture on the delivery detail page */
export default function Pickup() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(`/deliveries/${id}`);
  }, [id, setLocation]);

  return null;
}
