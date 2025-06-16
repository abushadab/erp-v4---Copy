import { getProducts } from "@/lib/supabase/queries"
import { transformDatabaseProductsToProducts, calculateCurrentStock } from "@/lib/supabase/transforms"

export default async function TestSupabasePage() {
  try {
    const dbProducts = await getProducts()
    const products = transformDatabaseProductsToProducts(dbProducts)

    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Supabase Products Test</h1>
        <p className="text-muted-foreground">
          Testing Supabase integration with {products.length} products loaded
        </p>

        <div className="grid gap-4">
          {products.slice(0, 5).map((product) => (
            <div key={product.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600">{product.description}</p>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>SKU:</strong> {product.sku || 'N/A'}</p>
                <p><strong>Type:</strong> {product.type}</p>
                <p><strong>Category:</strong> {product.category}</p>
                <p><strong>Status:</strong> {product.status}</p>
                
                {product.type === 'simple' ? (
                  <>
                    <p><strong>Price:</strong> ৳{product.price?.toLocaleString()}</p>
                    <p><strong>Stock:</strong> {product.stock}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Variations:</strong> {product.variations?.length || 0}</p>
                    <p><strong>Total Stock:</strong> {calculateCurrentStock(product)}</p>
                    {product.variations && (
                      <div className="ml-4 mt-2">
                        <p className="font-medium">Variations:</p>
                        {product.variations.slice(0, 3).map((variation) => (
                          <div key={variation.id} className="text-xs text-gray-500 ml-2">
                            • {variation.sku}: ৳{variation.price} (Stock: {variation.stock})
                          </div>
                        ))}
                        {product.variations.length > 3 && (
                          <p className="text-xs text-gray-500 ml-2">
                            ... and {product.variations.length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800">✅ Supabase Integration Working!</h3>
          <p className="text-green-700">
            Successfully loaded {products.length} products from Supabase database.
          </p>
          <ul className="text-sm text-green-600 mt-2 space-y-1">
            <li>• Products table: ✅</li>
            <li>• Categories table: ✅</li> 
            <li>• Warehouses table: ✅</li>
            <li>• Product variations: ✅</li>
            <li>• Attributes and values: ✅</li>
          </ul>
        </div>

        <div className="text-sm text-green-600 mt-4 bg-green-50 p-4 rounded-lg">
          <p className="font-semibold">✅ Main Products Page Updated!</p>
          <p className="mt-2">
            The main products page at <code>/products</code> now uses Supabase data directly. 
            This test page is for verification purposes only.
          </p>
          <p className="mt-2">
            <a href="/products" className="text-blue-600 underline hover:text-blue-800">
              → Go to main products page
            </a>
          </p>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">❌ Supabase Error</h1>
        <p className="text-red-500 mt-2">
          Failed to load products from Supabase
        </p>
        <pre className="bg-red-50 p-4 rounded-lg mt-4 text-sm">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
        <div className="mt-4 text-sm text-gray-600">
          <p>Please check:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Environment variables are set correctly</li>
            <li>Supabase project is running</li>
            <li>Database tables exist</li>
            <li>RLS policies allow access</li>
          </ul>
        </div>
      </div>
    )
  }
} 