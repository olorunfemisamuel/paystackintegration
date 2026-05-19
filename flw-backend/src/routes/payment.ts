// src/routes/payment.ts
import { Router, type Request, type Response } from 'express'
import axios from 'axios'
import { getFlwSecretKey } from '../flwAuth.js'

const router = Router()

const FLW_API = 'https://api.flutterwave.com/v3'

// ── POST /api/payment/initiate ─────────────────────────────────────────────
router.post('/initiate', async (req: Request, res: Response) => {
  const { email, amount, currency, redirect_url } = req.body

  if (!email || !amount || !currency || !redirect_url) {
    res.status(400).json({ error: 'Missing required fields: email, amount, currency, redirect_url' })
    return
  }

  try {
    const token = getFlwSecretKey()

    const response = await axios.post(
      `${FLW_API}/payments`,
      {
        amount,
        currency,
        customer: { email },
        tx_ref: `txref-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        redirect_url,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    res.json(response.data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('FLW initiate error:', error.response?.data ?? error.message)
      res.status(500).json({ error: 'Failed to initiate payment', details: error.response?.data })
    } else {
      const err = error as Error
      console.error('FLW initiate error:', err.message)
      res.status(500).json({ error: 'Failed to initiate payment' })
    }
  }
})

// ── POST /api/payment/bank-transfer ───────────────────────────────────────
// Generates a dynamic virtual account for the user to transfer to
router.post('/bank-transfer', async (req: Request, res: Response) => {
  const { email, amount, name, phone } = req.body

  if (!email || !amount) {
    res.status(400).json({ error: 'Missing required fields: email, amount' })
    return
  }

 try {
    const token = getFlwSecretKey()

    const tx_ref = `txref-${Date.now()}-${Math.floor(Math.random() * 100000)}`

     const response = await axios.post(
      `${FLW_API}/charges?type=bank_transfer`,
      {
        tx_ref,   // ✅ use the variable
        amount,
        currency: 'NGN',
        email,
        fullname: name ?? 'Customer',
        phone_number: phone ?? '',
        is_permanent: false,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // ✅ Inject tx_ref into the response so the frontend can use it
    const responseData = response.data
    responseData.tx_ref = tx_ref

    console.log('FLW bank transfer response:', JSON.stringify(responseData, null, 2))
    res.json(responseData)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('FLW bank transfer error:', error.response?.data ?? error.message)
      res.status(500).json({ error: 'Failed to initiate bank transfer', details: error.response?.data })
    } else {
      const err = error as Error
      console.error('FLW bank transfer error:', err.message)
      res.status(500).json({ error: 'Failed to initiate bank transfer' })
    }
  }
})


// ── POST /api/payment/simulate-transfer ───────────────────────────────────
// ONLY for test mode — simulates a bank transfer coming in
router.post('/simulate-transfer', async (req: Request, res: Response) => {
  const { tx_ref, amount } = req.body

  if (!tx_ref) {
    res.status(400).json({ error: 'Missing required field: tx_ref' })
    return
  }

  try {
    const token = getFlwSecretKey()

    // Flutterwave sandbox: simulate an incoming bank transfer receipt.
    // NOTE: /transfers/simulate is for OUTGOING payouts — the correct
    // sandbox endpoint for incoming virtual-account transfers is below.
    const response = await axios.post(
      `${FLW_API}/virtual-account-numbers/simulate`,
      {
        tx_ref,
        amount: amount ?? 5000,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('[Simulate] Response:', JSON.stringify(response.data, null, 2))
    res.json(response.data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Simulate] FLW error:', error.response?.data ?? error.message)
      // Don't block the client — simulation is best-effort in test mode
      res.status(200).json({
        warning: 'Simulation endpoint returned an error (expected in some test environments). Proceed to verify manually.',
        details: error.response?.data,
      })
    } else {
      const err = error as Error
      console.error('[Simulate] Error:', err.message)
      res.status(200).json({ warning: err.message })
    }
  }
})

// ── GET /api/payment/verify/id/:transaction_id ────────────────────────────
router.get('/verify/id/:transaction_id', async (req: Request, res: Response) => {
  const { transaction_id } = req.params

  try {
    const token = getFlwSecretKey()

    const response = await axios.get(
      `${FLW_API}/transactions/${transaction_id}/verify`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    const transaction = response.data?.data

    if (!transaction) {
      // Return 200 so the poller can distinguish "not yet" from a broken route
      res.json({ verified: false, status: 'pending', message: 'Transaction not found yet' })
      return
    }

    if (transaction.status === 'successful') {
      res.json({ verified: true, transaction })
    } else {
      res.json({ verified: false, status: transaction.status, transaction })
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('FLW verify error:', error.response?.data ?? error.message)
      res.status(500).json({ error: 'Failed to verify payment', details: error.response?.data })
    } else {
      const err = error as Error
      console.error('FLW verify error:', err.message)
      res.status(500).json({ error: 'Failed to verify payment' })
    }
  }
})

// ── GET /api/payment/verify/:tx_ref ──────────────────────────────────────
router.get('/verify/:tx_ref', async (req: Request, res: Response) => {
  const { tx_ref } = req.params
  console.log('[Verify] Looking up tx_ref:', tx_ref)

  try {
    const token = getFlwSecretKey()

    const response = await axios.get(
      `${FLW_API}/transactions/verify_by_reference`,
      {
        params: { tx_ref },
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    console.log('[Verify] FLW raw response:', JSON.stringify(response.data, null, 2))

    const transaction = response.data?.data

    if (!transaction) {
      // Return 200 so the poller can distinguish "not yet" from a broken route
      res.json({ verified: false, status: 'pending', message: 'Transaction not found yet' })
      return
    }

    if (transaction.status === 'successful') {
      res.json({ verified: true, transaction })
    } else {
      res.json({ verified: false, status: transaction.status, transaction })
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('FLW verify error:', error.response?.data ?? error.message)
      const message = JSON.stringify(error.response?.data ?? error.message).toLowerCase()

      if (error.response?.status === 400 || error.response?.status === 404 || message.includes('not found')) {
        res.json({ verified: false, status: 'pending', message: 'Transaction not found yet' })
        return
      }

      res.status(500).json({ error: 'Failed to verify payment', details: error.response?.data })
    } else {
      const err = error as Error
      console.error('FLW verify error:', err.message)
      res.status(500).json({ error: 'Failed to verify payment' })
    }
  }
})

export default router
