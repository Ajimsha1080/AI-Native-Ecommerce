import { commerceEngine } from '../commerce';
import { db } from '../db';

export interface ToolCallRequest {
  tool_id: string;
  parameters: Record<string, any>;
  workspace_id: string;
  agent_id: string;
  conversation_id: string;
}

export interface ToolCallResult {
  tool_id: string;
  status: 'SUCCESS' | 'FAILED' | 'CONFIRMATION_REQUIRED' | 'APPROVAL_REQUIRED' | 'PERMISSION_DENIED';
  message: string;
  data?: any;
  interactive_payload?: {
    type: 'PRODUCTS' | 'ORDER_TRACKING' | 'CONFIRMATION' | 'QUICK_REPLIES' | 'CART_SUMMARY';
    data: any;
  };
  latency_ms: number;
}

export async function executeTool(request: ToolCallRequest): Promise<ToolCallResult> {
  const startTime = Date.now();
  const { tool_id, parameters, workspace_id, agent_id } = request;

  const permission = db.tool_permissions.find(
    p => p.agent_id === agent_id && p.tool_id === tool_id
  );

  if (permission && !permission.is_enabled) {
    return {
      tool_id,
      status: 'PERMISSION_DENIED',
      message: 'Tool ' + tool_id + ' is disabled by merchant configuration.',
      latency_ms: Date.now() - startTime
    };
  }

  try {
    switch (tool_id) {
      case 'product_search': {
        const products = await commerceEngine.searchProducts(workspace_id, {
          query: parameters.query,
          category: parameters.category,
          minPrice: parameters.max_price ? undefined : parameters.min_price,
          maxPrice: parameters.max_price,
          size: parameters.size,
          color: parameters.color,
          inStockOnly: parameters.in_stock_only !== false
        });

        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Found ' + products.length + ' matching products.',
          data: products,
          interactive_payload: products.length > 0 ? {
            type: 'PRODUCTS',
            data: products.slice(0, 4)
          } : undefined,
          latency_ms: Date.now() - startTime
        };
      }

      case 'product_details': {
        const product = await commerceEngine.getProduct(workspace_id, parameters.product_id);
        if (!product) {
          return {
            tool_id,
            status: 'FAILED',
            message: 'Product ID not found.',
            latency_ms: Date.now() - startTime
          };
        }
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Retrieved details for ' + product.title,
          data: product,
          interactive_payload: { type: 'PRODUCTS', data: [product] },
          latency_ms: Date.now() - startTime
        };
      }

      case 'inventory_lookup': {
        const inventory = await commerceEngine.getInventory(
          workspace_id,
          parameters.product_id,
          parameters.variant_id
        );
        return {
          tool_id,
          status: 'SUCCESS',
          message: inventory.in_stock
            ? 'In stock with ' + inventory.available_quantity + ' units available.'
            : 'Currently out of stock.',
          data: inventory,
          latency_ms: Date.now() - startTime
        };
      }

      case 'order_lookup': {
        const order = await commerceEngine.getOrder(workspace_id, parameters.order_number);
        if (!order) {
          return {
            tool_id,
            status: 'FAILED',
            message: 'Order ' + parameters.order_number + ' was not found.',
            latency_ms: Date.now() - startTime
          };
        }
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Order ' + order.order_number + ' is ' + order.status,
          data: order,
          interactive_payload: {
            type: 'ORDER_TRACKING',
            data: order
          },
          latency_ms: Date.now() - startTime
        };
      }

      case 'order_tracking': {
        const tracking = await commerceEngine.getShippingStatus(workspace_id, parameters.order_number);
        if (!tracking) {
          return {
            tool_id,
            status: 'FAILED',
            message: 'Tracking info not found for order.',
            latency_ms: Date.now() - startTime
          };
        }
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Order ' + tracking.order_number + ' is ' + tracking.status,
          data: tracking,
          latency_ms: Date.now() - startTime
        };
      }

      case 'cart_lookup': {
        const cart = await commerceEngine.getCart(workspace_id, parameters.cart_id || 'default_cart');
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Cart has ' + cart.items.length + ' item(s). Total: $' + cart.total.toFixed(2),
          data: cart,
          interactive_payload: { type: 'CART_SUMMARY', data: cart },
          latency_ms: Date.now() - startTime
        };
      }

      case 'add_to_cart': {
        const cart = await commerceEngine.addToCart(workspace_id, parameters.cart_id || 'default_cart', {
          productId: parameters.product_id,
          variantId: parameters.variant_id,
          quantity: parameters.quantity || 1
        });
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Item added to cart. Total: $' + cart.total.toFixed(2),
          data: cart,
          interactive_payload: { type: 'CART_SUMMARY', data: cart },
          latency_ms: Date.now() - startTime
        };
      }

      case 'coupon_validation': {
        const result = await commerceEngine.validateCoupon(
          workspace_id,
          parameters.coupon_code,
          parameters.cart_subtotal || 100
        );
        return {
          tool_id,
          status: result.valid ? 'SUCCESS' : 'FAILED',
          message: result.description,
          data: result,
          latency_ms: Date.now() - startTime
        };
      }

      case 'return_eligibility': {
        const result = await commerceEngine.checkReturnEligibility(
          workspace_id,
          parameters.order_number,
          parameters.product_id
        );
        return {
          tool_id,
          status: 'SUCCESS',
          message: result.reason,
          data: result,
          latency_ms: Date.now() - startTime
        };
      }

      case 'human_handoff': {
        const conv = db.conversations.find(c => c.id === request.conversation_id);
        if (conv) {
          conv.status = 'ESCALATED';
          conv.escalation_reason = parameters.reason || 'Customer requested live support agent';
          conv.updated_at = new Date().toISOString();
          db.scheduleSave();
        }
        return {
          tool_id,
          status: 'SUCCESS',
          message: 'Conversation escalated to human customer support team.',
          data: { escalated: true, reason: parameters.reason },
          latency_ms: Date.now() - startTime
        };
      }

      default:
        return {
          tool_id,
          status: 'FAILED',
          message: 'Unknown tool ' + tool_id,
          latency_ms: Date.now() - startTime
        };
    }
  } catch (err: any) {
    return {
      tool_id,
      status: 'FAILED',
      message: err.message || 'Execution error encountered in tool.',
      latency_ms: Date.now() - startTime
    };
  }
}
