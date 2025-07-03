import React from 'react'
import { Outlet, redirect } from 'react-router'
import {SidebarComponent} from '@syncfusion/ej2-react-navigations';
import { MobileSidebar, NavItems } from 'components';
import { getExistingUser, storeUserData } from '~/appwrite/auth';

export async function clientLoader() {
  if (typeof window === 'undefined') return null;

  const { account } = await import('~/appwrite/client');
  if (!account) return null;
  try {
    const user = await account.get();
    if (user?.$id) return redirect('/sign-in');

    const existingUser = await getExistingUser(user.$id);
    if(existingUser?.status === "user"){
      return redirect('/')
    }

    return existingUser?.$id ? existingUser : await storeUserData();
  } catch (e) {
    console.error('Error in clientLoader', e);
    return redirect('/sign-in')
  }

  return null;
}

const AdminLayout = () => {
  return (
    <div className='admin-layout'>
       <MobileSidebar/>
       <aside className="w-full max-w-[270px] hidden lg:block">
        <SidebarComponent width={270} enableGestures={false}>
            <NavItems/>
        </SidebarComponent>
        </aside>
        <aside className='children'>
            <Outlet/>
        </aside> 
    </div>
  )
}

export default AdminLayout