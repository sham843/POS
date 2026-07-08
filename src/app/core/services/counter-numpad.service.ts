import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CartItem } from './counter-sale.service';

@Injectable({
  providedIn: 'root'
})
export class CounterNumpadService {

  calculateNumpadInput(
    val: string,
    currentVal: string,
    mode: 'quantity' | 'amount' | 'discount',
    shouldReplace: boolean,
    hasQuickWeight: boolean
  ): {
    nextVal: string;
    nextShouldReplace: boolean;
    nextHasQuickWeight: boolean;
    errorMessage?: string;
  } {
    let nextVal = currentVal;
    let nextShouldReplace = shouldReplace;
    let nextHasQuickWeight = hasQuickWeight;
    let errorMessage: string | undefined;

    if (nextShouldReplace && val !== 'backspace' && val !== 'clear') {
      if (!val.startsWith('.')) {
        nextVal = mode === 'discount' ? '' : '0';
        nextHasQuickWeight = false;
      }
    }
    nextShouldReplace = false;

    if (val === 'backspace') {
      if (mode === 'quantity' && nextHasQuickWeight && nextVal.includes('.')) {
        const parts = nextVal.split('.');
        if (parts[0].length > 1) {
          nextVal = parts[0].slice(0, -1) + '.' + parts[1];
        } else if (parts[0] !== '0') {
          nextVal = '0.' + parts[1];
        } else {
          nextVal = '1';
          nextHasQuickWeight = false;
          nextShouldReplace = true;
        }
      } else {
        nextVal = nextVal.slice(0, -1);
        if (nextVal === '' || (mode === 'quantity' && nextVal === '0')) {
          if (mode === 'quantity') {
            nextVal = '1';
            nextShouldReplace = true;
          } else if (mode === 'amount') {
            nextVal = '0';
          } else {
            nextVal = '';
          }
        }
      }
    } else if (val === 'clear') {
      if (mode === 'quantity') {
        nextVal = '1';
        nextShouldReplace = true;
      } else if (mode === 'amount') {
        nextVal = '0';
      } else {
        nextVal = '';
      }
      nextHasQuickWeight = false;
    } else if (val.startsWith('.')) {
      if (val.length > 1) { // Quick weight (.125, .250, etc)
        if (nextVal.includes('.')) {
          nextVal = nextVal.split('.')[0] + val;
        } else {
          nextVal = (nextVal || '0') + val;
        }
        nextHasQuickWeight = true;
      } else { // Manual dot
        if (!nextVal.includes('.')) {
          nextVal = (nextVal || '0') + val;
        }
        nextHasQuickWeight = false;
      }
    } else { // Numeric digit
      if (mode === 'quantity' && nextHasQuickWeight && nextVal.includes('.')) {
        const parts = nextVal.split('.');
        nextVal = (parts[0] === '0' ? val : parts[0] + val) + '.' + parts[1];
      } else if (nextVal.includes('.')) {
        const parts = nextVal.split('.');
        let maxDecimals = 0;
        if (mode === 'discount' || mode === 'amount') {
          maxDecimals = 2;
        } else if (mode === 'quantity') {
          maxDecimals = 2;
        }

        if (parts[1].length < maxDecimals) {
          nextVal += val;
        }
      } else {
        if (nextVal === '0' || nextVal === '') {
          nextVal = val;
        } else {
          nextVal += val;
        }
      }
    }

    if (mode === 'discount') {
      if (parseFloat(nextVal) > environment.maxDiscount) {
        nextVal = environment.maxDiscount.toString();
        errorMessage = `Discount cannot exceed ${environment.maxDiscount}%`;
      }
    }

    return {
      nextVal,
      nextShouldReplace,
      nextHasQuickWeight,
      errorMessage
    };
  }

  updateCartItemFromNumpad(
    item: CartItem,
    mode: 'quantity' | 'amount' | 'discount',
    numpadValue: string
  ): CartItem {
    const updatedItem = { ...item };
    const valNum = parseFloat(numpadValue) || 0;
    const isExcluded = (updatedItem.product?.['computationMethod'] || '').toUpperCase().includes('EXCLUDED');

    if (mode === 'quantity') {
      updatedItem.quantity = valNum;
      updatedItem.amount = isExcluded
        ? Math.round((updatedItem.rate * updatedItem.quantity) * 100) / 100
        : Math.round(((updatedItem.rate * updatedItem.quantity) / (1 + updatedItem.gst / 100)) * 100) / 100;
    } else if (mode === 'amount') {
      if (updatedItem.product?.mensurationUnit === 'Nos') {
        return updatedItem;
      }
      if (isExcluded) {
        const netAmount = Math.round(valNum * 100) / 100;
        const discountFactor = 1 - (updatedItem.discount / 100);
        if (discountFactor > 0) {
          updatedItem.amount = Math.round((netAmount / discountFactor) * 100) / 100;
        } else {
          updatedItem.amount = netAmount;
        }
        if (updatedItem.rate > 0) {
          updatedItem.quantity = Math.round((updatedItem.amount / updatedItem.rate) * 100) / 100;
        }
      } else {
        const gstRate = updatedItem.gst || 0;
        const enteredVal = Math.round(valNum * 100) / 100;
        const netAmount = Math.round((enteredVal / (1 + gstRate / 100)) * 100) / 100;
        const discountFactor = 1 - (updatedItem.discount / 100);
        if (discountFactor > 0) {
          updatedItem.amount = Math.round((netAmount / discountFactor) * 100) / 100;
        } else {
          updatedItem.amount = netAmount;
        }
        if (updatedItem.rate > 0) {
          updatedItem.quantity = Math.round(((updatedItem.amount * (1 + gstRate / 100)) / updatedItem.rate) * 100) / 100;
        }
        updatedItem.netAmount = netAmount;
        updatedItem.gstAmount = Math.round((enteredVal - netAmount) * 100) / 100;
        updatedItem.total = enteredVal;
      }
    } else if (mode === 'discount') {
      updatedItem.discount = valNum;
    }

    if (mode !== 'amount' || isExcluded) {
      updatedItem.netAmount = Math.round((updatedItem.amount - (updatedItem.amount * updatedItem.discount / 100)) * 100) / 100;
      updatedItem.gstAmount = Math.round((updatedItem.netAmount * updatedItem.gst / 100) * 100) / 100;
      updatedItem.total = Math.round((updatedItem.netAmount + updatedItem.gstAmount) * 100) / 100;
    }

    return updatedItem;
  }
}
