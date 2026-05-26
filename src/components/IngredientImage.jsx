import React from 'react'
import {
  GiCheeseWedge, GiAppleCore, GiBroccoli, GiWheat,
  GiSaltShaker, GiKetchup, GiSteak, GiChiliPepper, GiFishbone,
} from 'react-icons/gi'

const IngredientImage = ({ imageUrl, name }) => {
  const renderIcon = () => {
    switch (imageUrl) {
      case 'assets/icons/dairy.svg': return <GiCheeseWedge size={50} className="text-yellow-500" />
      case 'assets/icons/fruit.svg': return <GiAppleCore size={50} className="text-red-500" />
      case 'assets/icons/herb.svg': return <GiBroccoli size={50} className="text-emerald-500" />
      case 'assets/icons/grain.svg': return <GiWheat size={50} className="text-amber-600" />
      case 'assets/icons/pantry.svg': return <GiSaltShaker size={50} className="text-gray-400" />
      case 'assets/icons/sauce.svg': return <GiKetchup size={50} className="text-red-600" />
      case 'assets/icons/meat.svg': return <GiSteak size={50} className="text-red-700" />
      case 'assets/icons/vegetable.svg': return <GiChiliPepper size={50} className="text-green-600" />
      case 'assets/icons/fish.svg': return <GiFishbone size={50} className="text-blue-400" />
      default: return <GiSaltShaker size={50} className="text-gray-400" />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-2 p-3 bg-gray-50 rounded-full">
        {renderIcon()}
      </div>
      <span className="text-sm font-medium text-gray-700">{name}</span>
    </div>
  )
}

export default IngredientImage
