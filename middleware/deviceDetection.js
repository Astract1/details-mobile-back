/**
 * Middleware para detectar si la petición viene de un dispositivo móvil o PC
 * Analiza el User-Agent header para determinar el tipo de dispositivo
 */
export const detectDevice = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';

  // Patrones comunes de User-Agent para dispositivos móviles
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
    /mobile/i
  ];

  // Verificar si algún patrón coincide
  const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));

  // Agregar información del dispositivo al objeto request
  req.device = {
    isMobile: isMobile,
    isDesktop: !isMobile,
    userAgent: userAgent
  };

  next();
};
