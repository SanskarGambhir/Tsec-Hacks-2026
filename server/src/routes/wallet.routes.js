import { Router } from 'express';
import { addAmountToWallet,addNewWallet } from '../controllers/wallet.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router = Router();

// Below line of code means that when a POST request is made to "/register", the registerUser controller function will be called.
// Unsecure Routes
router.route('/add').post(verifyJWT,addAmountToWallet);
router.route('/add_new').post(verifyJWT,addNewWallet);


export default router;