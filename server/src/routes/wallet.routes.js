import { Router } from 'express';
import { addAmountToWallet } from '../controllers/wallet.controllers.js';

const router = Router();

// Below line of code means that when a POST request is made to "/register", the registerUser controller function will be called.
// Unsecure Routes
router.route('/add').post(addAmountToWallet);


export default router;