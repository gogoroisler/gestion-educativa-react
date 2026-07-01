import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Espera "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, nombre, rol, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Devuelve un middleware que solo deja pasar usuarios con uno de los roles indicados.
// Uso: router.get('/ruta', verifyToken, requireRole('admin'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return res.status(403).json({ error: 'Sin permisos para esta operación' });
    }
    next();
  };
}
