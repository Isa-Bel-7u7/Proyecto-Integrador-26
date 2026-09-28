export const PAIS_DATA = [
  { pais: 'Bolivia', codigo: '+591', nacionalidad: 'Boliviana', ciudades: ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz de la Sierra', 'Sucre', 'Oruro', 'Potosí', 'Tarija', 'Trinidad', 'Cobija', 'Sacaba', 'Quillacollo', 'Montero', 'Riberalta', 'Yacuiba', 'Villazón', 'Tupiza', 'Camiri', 'Warnes', 'Viacha'] },
  { pais: 'Argentina', codigo: '+54', nacionalidad: 'Argentina', ciudades: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan'] },
  { pais: 'Brasil', codigo: '+55', nacionalidad: 'Brasileña', ciudades: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'] },
  { pais: 'Chile', codigo: '+56', nacionalidad: 'Chilena', ciudades: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Iquique', 'Puerto Montt', 'Arica'] },
  { pais: 'Colombia', codigo: '+57', nacionalidad: 'Colombiana', ciudades: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Manizales'] },
  { pais: 'Ecuador', codigo: '+593', nacionalidad: 'Ecuatoriana', ciudades: ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Manta', 'Portoviejo', 'Loja', 'Ambato', 'Riobamba'] },
  { pais: 'Paraguay', codigo: '+595', nacionalidad: 'Paraguaya', ciudades: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Encarnación', 'Caaguazú', 'Pedro Juan Caballero'] },
  { pais: 'Perú', codigo: '+51', nacionalidad: 'Peruana', ciudades: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Iquitos', 'Huancayo', 'Tacna', 'Puno'] },
  { pais: 'Uruguay', codigo: '+598', nacionalidad: 'Uruguaya', ciudades: ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes', 'Artigas'] },
  { pais: 'Venezuela', codigo: '+58', nacionalidad: 'Venezolana', ciudades: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'San Cristóbal', 'Maturín', 'Barcelona', 'Mérida'] },
  { pais: 'México', codigo: '+52', nacionalidad: 'Mexicana', ciudades: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Mérida', 'Cancún', 'Querétaro', 'Toluca'] },
  { pais: 'España', codigo: '+34', nacionalidad: 'Española', ciudades: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante'] },
  { pais: 'Estados Unidos', codigo: '+1', nacionalidad: 'Estadounidense', ciudades: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Miami'] },
  { pais: 'Canadá', codigo: '+1', nacionalidad: 'Canadiense', ciudades: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Quebec', 'Winnipeg', 'Hamilton', 'Halifax'] },
  { pais: 'Francia', codigo: '+33', nacionalidad: 'Francesa', ciudades: ['París', 'Marsella', 'Lyon', 'Toulouse', 'Niza', 'Nantes', 'Montpellier', 'Estrasburgo', 'Burdeos', 'Lille'] },
  { pais: 'Italia', codigo: '+39', nacionalidad: 'Italiana', ciudades: ['Roma', 'Milán', 'Nápoles', 'Turín', 'Palermo', 'Génova', 'Bolonia', 'Florencia', 'Venecia', 'Verona'] },
  { pais: 'Alemania', codigo: '+49', nacionalidad: 'Alemana', ciudades: ['Berlín', 'Hamburgo', 'Múnich', 'Colonia', 'Fráncfort', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'] },
  { pais: 'Reino Unido', codigo: '+44', nacionalidad: 'Británica', ciudades: ['Londres', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Glasgow', 'Edimburgo', 'Bristol', 'Cardiff', 'Belfast'] },
  { pais: 'China', codigo: '+86', nacionalidad: 'China', ciudades: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Wuhan', 'Xi’an', 'Hangzhou', 'Nanjing', 'Tianjin'] },
  { pais: 'Japón', codigo: '+81', nacionalidad: 'Japonesa', ciudades: ['Tokio', 'Osaka', 'Kioto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Sendai'] },
];

export const normalizarTexto = (texto?: string | null) => (texto ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const soloLetrasNombre = (texto: string) => texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]/g, '').replace(/\s{2,}/g, ' ');
export const soloDigitos = (texto: string) => texto.replace(/\D/g, '');
export const getPaisData = (pais?: string | null) => PAIS_DATA.find((p) => normalizarTexto(p.pais) === normalizarTexto(pais));
export const getCiudadesPais = (pais?: string | null) => getPaisData(pais)?.ciudades ?? [];

export const separarTelefono = (telefono?: string | null) => {
  const raw = (telefono ?? '').trim();
  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  return {
    codigo: match?.[1] ?? '+591',
    numero: soloDigitos(match?.[2] ?? raw.replace(/^\+\d{1,4}/, '')),
  };
};
