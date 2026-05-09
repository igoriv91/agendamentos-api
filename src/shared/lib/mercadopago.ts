import MercadoPago from 'mercadopago'

export const mpClient = new MercadoPago({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '',
})
